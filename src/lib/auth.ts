export function getDeviceId(): string {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}
export function setDeviceId(newId: string) {
  localStorage.setItem("device_id", newId);
}
