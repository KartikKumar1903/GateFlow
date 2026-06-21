const API_URL = import.meta.env.PROD
  ? "/api"
  : (import.meta.env.VITE_API_URL || "http://localhost:5000/api");

const getAuthHeaders = () => {
  const token = localStorage.getItem("gateflow-v3-token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

export const createSchedule = async (payload) => {
  const response = await fetch(`${API_URL}/schedule`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Unable to build schedule");
  }

  return response.json();
};
