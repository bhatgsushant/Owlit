import React from 'react';
import Profile from './Profile';

// Reuse the merged Profile/Account page to keep /account route alive
export default function Account() {
  return <Profile />;
}
