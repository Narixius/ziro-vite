import { Body, Head, Html } from './client.js'

export default function ErrorHandler({ error, resetErrorBoundary, ...rest }: any) {
  //   debugger
  //   console.log(rest.isRootRendered)
  const content = (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'black',
        flexDirection: 'column',
      }}
    >
      <p>{error.name}</p>
      <p style={{ color: 'black' }}>
        {error.status} {error.message}
      </p>
    </div>
  )
  if (rest.isRootRendered) {
    return content
  }
  return (
    <Html>
      <Head></Head>
      <Body>{content}</Body>
    </Html>
  )
}
