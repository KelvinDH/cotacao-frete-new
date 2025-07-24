import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function TestAPI() {
  const [testResult, setTestResult] = useState('');

  const testStates = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/states');
      const data = await response.json();
      setTestResult(`Estados: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setTestResult(`Erro: ${error.message}`);
    }
  };

  const testCities = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/cities?state_id=25'); // São Paulo
      const data = await response.json();
      setTestResult(`Cidades SP: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setTestResult(`Erro: ${error.message}`);
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-bold mb-2">Teste da API</h3>
      <div className="space-x-2 mb-4">
        <Button onClick={testStates} size="sm">Testar Estados</Button>
        <Button onClick={testCities} size="sm">Testar Cidades SP</Button>
      </div>
      <pre className="text-xs bg-white p-2 rounded max-h-60 overflow-auto">
        {testResult}
      </pre>
    </div>
  );
}