export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  
  try {
    const token = localStorage.getItem('logichat_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  
  return headers;
};
