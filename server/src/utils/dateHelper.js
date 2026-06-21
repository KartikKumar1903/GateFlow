export const getISTTimestamp = () => {
  return new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
};
