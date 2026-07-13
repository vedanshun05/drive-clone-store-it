"use server"

type CreateAccountParams = {
  fullName: string
  email: string
}

type SignInUserParams = {
  email: string
}

type VerifySecretParams = {
  accountId: string
  password: string
}

type SendEmailOTPParams = {
  email: string
}

type AuthResult = {
  accountId: string | null
}

const notImplemented = (actionName: string): never => {
  throw new Error(
    `${actionName} is not implemented. Wire your auth provider in lib/actions/user.actions.ts.`
  )
}

export const createAccount = async (
  _params: CreateAccountParams
): Promise<AuthResult> => {
  return notImplemented("createAccount")
}

export const signInUser = async (
  _params: SignInUserParams
): Promise<AuthResult> => {
  return notImplemented("signInUser")
}

export const verifySecret = async (
  _params: VerifySecretParams
): Promise<string | null> => {
  return notImplemented("verifySecret")
}

export const sendEmailOTP = async (
  _params: SendEmailOTPParams
): Promise<string | null> => {
  return notImplemented("sendEmailOTP")
}
