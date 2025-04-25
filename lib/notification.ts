export const sendNotification = async (title: string) => {
  await fetch(process.env.MOE_PUSH_URL || "", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
    }),
  });
};
