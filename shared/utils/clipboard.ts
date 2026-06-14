export interface ClipboardPort {
  writeText(text: string): Promise<void>
}

export const copyTextToClipboard = async (
  text: string,
  clipboard: ClipboardPort | undefined = globalThis.navigator?.clipboard
) => {
  if (!clipboard) {
    throw new Error('Clipboard API is not available')
  }

  await clipboard.writeText(text)
}
