import { FC, HTMLProps } from 'react'

export const Html: FC<HTMLProps<HTMLHtmlElement>> = props => {
  return <html {...props} />
}
export const Head: FC<HTMLProps<HTMLHeadElement>> = props => {
  return <head {...props} />
}
export const Body: FC<HTMLProps<HTMLBodyElement>> = props => {
  return <body {...props} />
}
