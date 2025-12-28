import os
import argparse
import supabase
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
import openai
import pandas as pd

# --- Initialization ---
def initialize():
    """Initializes Supabase client, embedding model, and LLM."""
    load_dotenv()
    if not os.getenv("SUPABASE_URL"):
        # Fallback to server/.env
        load_dotenv(os.path.join("server", ".env"))
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    openai.api_key = os.getenv("OPENAI_API_KEY")

    if not all([supabase_url, supabase_key]):
        raise ValueError("Could not find SUPABASE_URL and SUPABASE_SERVICE_KEY/SUPABASE_KEY in .env file.")
    if not openai.api_key:
        print("Warning: OPENAI_API_KEY not found. Query functionality will be disabled.")


    client = supabase.create_client(supabase_url, supabase_key)
    # Using 'all-MiniLM-L6-v2' which has 384 dimensions, matching the SQL function
    model = SentenceTransformer('all-MiniLM-L6-v2')
    return client, model

# --- Data Embedding ---
def embed_data(client, model):
    """Fetches data from v_receipt_line_items_enriched, creates embeddings, and stores them."""
    try:
        print("Fetching data from 'v_receipt_line_items_enriched'...")
        response = client.table("v_receipt_line_items_enriched").select("*", count='exact').execute()
        
        print(f"Supabase API response received.")

        if not response.data or response.count == 0:
            print(f"No data found in 'v_receipt_line_items_enriched'. The view might be empty. (Count: {response.count})")
            return

        df = pd.DataFrame(response.data)
        print(f"Successfully loaded data into pandas DataFrame. Found {len(df)} rows to process.")

        # Create a descriptive text for each row to be embedded
        def create_text_representation(row):
            return (
                f"Item: {row.get('item', 'N/A')}, "
                f"Price: {row.get('price', 'N/A')}, "
                f"Quantity: {row.get('quantity', 'N/A')}, "
                f"Category: {row.get('main_category', 'N/A')} ({row.get('sub_category', 'N/A')}), "
                f"Merchant: {row.get('merchant_name', 'N/A')}, "
                f"Date: {row.get('transaction_date', 'N/A')}, "
                f"Normalized Name: {row.get('normalized_name', 'N/A')}, "
                f"Store Category: {row.get('store_main_category', 'N/A')}, "
                f"Store Type: {row.get('store_type', 'N/A')}"
            )

        df['content'] = df.apply(create_text_representation, axis=1)
        texts_to_embed = df['content'].tolist()

        print(f"Generating embeddings for {len(texts_to_embed)} texts... (This may take a while)")
        embeddings = model.encode(texts_to_embed, show_progress_bar=True)
        print("Embeddings generated.")

        # Prepare data for upsert
        data_to_upsert = []
        for index, row in df.iterrows():
            content = texts_to_embed[index]
            embedding = embeddings[index].tolist()
            record = {
                'content': content, 
                'embedding': embedding,
                'user_id': row.get('user_id') # Capture user_id from the view
            }
            data_to_upsert.append(record)
        
        print(f"Preparing {len(data_to_upsert)} records for upsert.")

        print("Deleting old data from 'documents_with_embeddings'...")
        client.table('documents_with_embeddings').delete().gt('id', -1).execute() # Deletes all rows where id > -1
        print("Old data deleted.")

        print("Upserting new data...")
        upsert_response = client.table('documents_with_embeddings').upsert(data_to_upsert).execute()
        
        print("Data upsert command executed.")

        if upsert_response.data:
             print(f"Upsert successful. Response data has {len(upsert_response.data)} records.")
        else:
             print("Upsert may not have been successful, as no data was returned in the response.")

        # As a final check, let's query the count.
        print("Verifying row count in 'documents_with_embeddings' table...")
        count_response = client.table('documents_with_embeddings').select('id', count='exact').execute()
        
        print(f"Verification: Found {count_response.count} rows in the table after upsert.")
        
        if count_response.count > 0:
            print("Data embedded and stored successfully!")
        else:
            print("Problem detected: Table is still empty after upsert.")

    except Exception as e:
        print(f"An error occurred during the embedding process: {e}")
        import traceback
        traceback.print_exc()


# --- RAG Query ---
def query_rag(client, model, query_text, top_k=500, verbose=True):
    """Performs a RAG query against the stored embeddings."""
    if not openai.api_key:
        return "OpenAI API key not configured. Cannot generate an answer.", []

    if verbose:
        print(f"Embedding query: '{query_text}'")
    query_embedding = model.encode(query_text)

    if verbose:
        print("Searching for relevant documents in Supabase...")
    results = client.rpc('match_documents', {
        'query_embedding': query_embedding.tolist(),
        'match_threshold': 0.01,  # Adjust this threshold as needed
        'match_count': top_k
    }).execute()

    if not results.data:
        return "I couldn't find any relevant information in the database.", []

    retrieved_docs_content = [doc['content'] for doc in results.data]
    context = "\n---".join(retrieved_docs_content)

    system_prompt = "You are a friendly financial assistant. Your goal is to answer questions about the user's spending based on their receipt data. Summarize the information and provide clear, concise answers. Do not just list transactions. Be conversational."

    user_prompt = f"""Based on the following receipt information, please provide a conversational answer to my question.

If I ask for a total, calculate it from the items provided.

**Receipt Data:**
{context}

**My Question:**
{query_text}
"""
    if verbose:
        print("Generating answer with OpenAI...")
    try:
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2, # Lower temperature for more factual, less creative answers
        )
        answer = response.choices[0].message.content
    except Exception as e:
        answer = f"Error generating answer from OpenAI: {e}"


    return answer, retrieved_docs_content


# --- Main execution ---
def main():
    """Main function to handle command-line arguments for embedding or querying."""
    parser = argparse.ArgumentParser(description="RAG with Supabase and OpenAI")
    parser.add_argument('action', choices=['embed', 'query', 'chat'], help="The action to perform. 'chat' mode provides an interactive session.")
    parser.add_argument('--query', type=str, help="The question to ask (required for 'query' action).")

    args = parser.parse_args()

    try:
        client, model = initialize()

        if args.action == 'embed':
            embed_data(client, model)
        elif args.action == 'query':
            if not args.query:
                print("Error: --query argument is required for 'query' action.")
                return
            answer, _ = query_rag(client, model, args.query, verbose=True)
            print("\n--- Answer ---")
            print(answer)
        elif args.action == 'chat':
            print("Entering chat mode. Type 'exit' or 'quit' to end the session.")
            print("Ask a question about your spending, for example: 'How much did I spend on groceries this month?'")
            while True:
                try:
                    user_query = input("\nYou: ")
                    if user_query.lower() in ['exit', 'quit']:
                        print("🤖 Assistant: Goodbye!")
                        break
                    if not user_query.strip():
                        continue
                    
                    print("🤖 Assistant: Thinking...")
                    answer, _ = query_rag(client, model, user_query, verbose=False)
                    print(f"🤖 Assistant: {answer}")
                except (KeyboardInterrupt, EOFError):
                    print("\n🤖 Assistant: Goodbye!")
                    break

    except Exception as e:
        print(f"An error occurred: {e}")
        print("Please ensure you have run the initial SQL setup in Supabase.")
        print("Also, make sure you have the required Python packages installed: pip install supabase python-dotenv sentence-transformers openai pandas")
        print("And your .env file is configured with SUPABASE_URL, SUPABASE_KEY, and OPENAI_API_KEY.")


if __name__ == "__main__":
    main()
