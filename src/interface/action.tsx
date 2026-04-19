export enum IAction {
    MANO = "MANO",
    ACTIVACION = "ACTIVACION",
    DESTRUCCION = "DESTRUCCION",
    INSTANTANEA = "INSTANTANEA",
    TURNO = "TURNO",
    SIN_EFECTO = "SIN_EFECTO",
}
export const IActionDescription: {
    [id in IAction]: string
} = {
    SIN_EFECTO:"No hace nada.",
    MANO: "Actívala desde tu mano en cualquier momento. No se coloca. Se destruye tras usarla.",
    ACTIVACION: "Al formar 3 en línea, desata su efecto.",
    DESTRUCCION: "Al ser destruida, libera su efecto.",
    INSTANTANEA: "Al colocarla, su efecto se activa al instante.",
    TURNO: "Al inicio de tu turno, activa su efecto (excepto el turno en que entra).",
}