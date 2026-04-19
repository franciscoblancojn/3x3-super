// game-3x3-super/src/assets/users/IUsers.svg
export enum IUsers {
    Alianza = "Alianza",
    Espias = "Espias",
    Imperio = "Imperio",
    Legion = "Legion",
    Luna = "Luna",
    Nasa = "Nasa",
    Sol = "Sol",
    Iglecia = "Iglecia",
}

export const IUsersColors: {
    [id in IUsers]: string
} = {
    Alianza: "#0d6efd",
    Espias: "#212529",
    Imperio: "#ff9307ff",
    Legion: "#dc3545",
    Luna: "#0dcaf0",
    Nasa: "#6c757d",
    Sol: "#198754",
    Iglecia: "#ad25b9ff",
}
