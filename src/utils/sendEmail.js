// utils/sendEmail.js
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const response = await fetch('http://localhost:3001/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Erro ao enviar email');
    }
    
    return result;
  } catch (error) {
    console.error('Erro no envio do email:', error);
    throw error;
  }
};