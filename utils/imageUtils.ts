
export const base64ToBlob = async (base64Data: string): Promise<Blob> => {
  const base64Response = await fetch(base64Data);
  const blob = await base64Response.blob();
  return blob;
};
