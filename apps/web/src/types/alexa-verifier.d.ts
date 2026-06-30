declare module 'alexa-verifier' {
  function verify(
    certUrl: string,
    signature: string,
    body: string,
    callback: (err: Error | null) => void
  ): void;
  export default verify;
}
