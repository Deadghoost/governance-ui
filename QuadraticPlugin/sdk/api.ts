import {PublicKey} from '@solana/web3.js'
import {QuadraticClient} from '@solana/governance-program-library'
import {ProgramAccount, Realm, SYSTEM_PROGRAM_ID} from "@solana/spl-governance";
import {getRegistrarPDA} from "@utils/plugin/accounts";

export type Coefficients = [ a: number, b: number, c: number ];

// By default, the quadratic plugin will use a function ax-2 + bx - c
// resulting in a vote weight that is the square root of the token balance
// Future work will allow this to be configured in the UI if needed
export const DEFAULT_COEFFICIENTS: Coefficients = [ 1, 0, 0 ];

const toAnchorType = (coefficients: Coefficients) => ({
    a: coefficients[0],
    b: coefficients[1],
    c: coefficients[2],
    });

// Get the registrar account for a given realm
export const tryGetQuadraticRegistrar = async (
  registrarPk: PublicKey,
  quadraticClient: QuadraticClient
) => {
  try {
    return await quadraticClient.program.account.registrar.fetch(
      registrarPk
    )
  } catch (e) {
    return null
  }
}

// Create an instruction to create a registrar account for a given realm
export const createQuadraticRegistrarIx = async (
    realm: ProgramAccount<Realm>,
    payer: PublicKey,
    quadraticClient: QuadraticClient,
    coefficients?:  Coefficients,
    predecessor?: PublicKey,
) => {
    const {registrar} = await getRegistrarPDA(
        realm.pubkey,
        realm.account.communityMint,
        quadraticClient.program.programId
    )

    const remainingAccounts = predecessor
        ? [{pubkey: predecessor, isSigner: false, isWritable: false}]
        : []

    return quadraticClient!.program.methods
        .createRegistrar(toAnchorType(coefficients || DEFAULT_COEFFICIENTS), !!predecessor)
        .accounts({
            registrar,
            realm: realm.pubkey,
            governanceProgramId: realm.owner,
            realmAuthority: realm.account.authority!,
            governingTokenMint: realm.account.communityMint!,
            payer,
            systemProgram: SYSTEM_PROGRAM_ID,
        })
        .remainingAccounts(remainingAccounts)
        .instruction()
}
// Create an instruction to configure a registrar account for a given realm
export const configureQuadraticRegistrarIx = async (
    realm: ProgramAccount<Realm>,
    quadraticClient: QuadraticClient,
    coefficients?:  Coefficients,
    predecessor?: PublicKey
) => {
  const {registrar} = await getRegistrarPDA(
      realm.pubkey,
      realm.account.communityMint,
      quadraticClient.program.programId
  )
  const remainingAccounts = predecessor
      ? [{pubkey: predecessor, isSigner: false, isWritable: false}]
      : []
  return quadraticClient.program.methods
      .configureRegistrar(toAnchorType(coefficients || DEFAULT_COEFFICIENTS), !!predecessor)
      .accounts({
        registrar,
        realm: realm.pubkey,
        realmAuthority: realm.account.authority!,
      })
      .remainingAccounts(remainingAccounts)
      .instruction()
}