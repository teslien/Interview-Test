import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

const DebugTakeTest = () => {
  const { token } = useParams();

  useEffect(() => {
    console.log('DebugTakeTest component loaded with token:', token);
    toast.info('DebugTakeTest component loaded with token: ' + token);
  }, [token]);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Debug Take Test Component</h1>
      <p>Token: {token}</p>
      <p>This component is working!</p>
    </div>
  );
};

export default DebugTakeTest;