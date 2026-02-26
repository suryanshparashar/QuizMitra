import crypto from "crypto"
console.log("JWT Signatures")
console.log(`AccessTokenSignature:\n${crypto.randomBytes(64).toString("hex")}`)
console.log(`RefreshTokenSignature:\n${crypto.randomBytes(64).toString("hex")}`)
// console.log(`BetaVerificationTokenSignature:\n${crypto.randomBytes(64).toString("hex")}`)
// console.log(crypto.randomUUID())
console.log("\n")
