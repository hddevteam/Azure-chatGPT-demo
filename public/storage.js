let currentUsername = localStorage.getItem("currentUsername") || "guest";
export function setCurrentUsername(username) {
    currentUsername = username;
}
export { currentUsername };