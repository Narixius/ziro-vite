import { CopyIcon, Github } from 'lucide-react'
import { Body, Head, Html, Meta, MetaFunction, Outlet } from 'ziro/router'
import './styles.css'

export const meta: MetaFunction<'/'> = () => {
  return [
    {
      charSet: 'utf-8',
    },
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1',
    },
  ]
}
export default function RootComponent() {
  return (
    <Html lang="en">
      <Head>
        <Meta />
      </Head>
      <Body className="flex min-h-full flex-col bg-white dark:bg-gray-950">
        <div className="relative flex-none overflow-hidden px-6 lg:pointer-events-none lg:fixed lg:inset-0 lg:z-40 lg:flex lg:px-0">
          <div className="absolute inset-0 -z-10 overflow-hidden bg-gray-950 lg:right-[calc(max(2rem,50%-38rem)+40rem)] lg:min-w-[32rem]">
            <svg className="absolute -bottom-48 left-[-40%] h-[80rem] w-[180%] lg:-right-40 lg:bottom-auto lg:left-auto lg:top-[-40%] lg:h-[180%] lg:w-[80rem]" aria-hidden="true">
              <defs>
                <radialGradient id=":S1:-desktop" cx="100%">
                  <stop offset="0%" stopColor="rgba(63, 67, 69, 0.3)" />
                  <stop offset="53.95%" stopColor="rgba(46, 47, 51, 0.09)" />
                  <stop offset="100%" stopColor="rgba(21, 22, 23, 0)" />
                </radialGradient>
                <radialGradient id=":S1:-mobile" cy="100%">
                  <stop offset="0%" stopColor="rgba(63, 67, 69, 0.3)" />
                  <stop offset="53.95%" stopColor="rgba(46, 47, 51, 0.09)" />
                  <stop offset="100%" stopColor="rgba(21, 22, 23, 0)" />
                </radialGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#:S1:-desktop)" className="hidden lg:block" />
              <rect width="100%" height="100%" fill="url(#:S1:-mobile)" className="lg:hidden" />
            </svg>
            <div className="absolute inset-x-0 bottom-0 right-0 h-px bg-white mix-blend-overlay lg:left-auto lg:top-0 lg:h-auto lg:w-px" />
          </div>
          <div className="relative flex w-full lg:pointer-events-auto lg:mr-[calc(max(2rem,50%-38rem)+40rem)] lg:min-w-[32rem] lg:overflow-y-auto lg:overflow-x-hidden lg:pl-[max(4rem,calc(50%-38rem))]">
            <div className="mx-auto max-w-2xl lg:mx-0 lg:flex lg:w-96 lg:max-w-none lg:flex-col lg:before:flex-1 lg:before:pt-6">
              <div className="pb-16 pt-20 sm:pb-20 sm:pt-32 lg:py-20">
                <div className="relative">
                  <div>
                    <a href="/" className="font-display text-white text-4xl typography dark:typography-invert">
                      ۰ Ziro
                    </a>
                  </div>
                  <h1 className="mt-10 font-display text-2xl/tight font-light text-white">
                    Effortless SSR with Seamless <span className="bg-gradient-to-r from-neutral-200 to-neutral-400 inline-block text-transparent bg-clip-text">Server State Sync</span>
                  </h1>
                  <p className="mt-6 text-sm/6 text-gray-300">
                    Explore Ziro, a React framework for easy server-side rendering and real-time server state sync. Similar to Remix, it offers a streamlined developer experience for modern web
                    applications.
                  </p>
                  <div className="mt-8 mx-auto max-w-[384px]">
                    <div className="w-full group relative isolate p-1 flex justify-between items-center bg-gradient-to-r from-gray-800/60 to-gray-800/60 rounded-lg text-gray-300 border border-gray-800 ">
                      <div className="flex justify-start items-center">
                        <code className="px-3 opacity-30 select-none">$</code>
                        <code className="text-sm">npx create ziro-app</code>
                      </div>
                      <button className="opacity-50 group-hover:opacity-90 transition p-2 hover:bg-gray-700 rounded-md border border-transparent hover:border-gray-600">
                        <CopyIcon size="14" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-8 flex flex-wrap justify-center gap-x-1 gap-y-3 sm:gap-x-2 lg:justify-start">
                    <a
                      className="flex-none group relative isolate flex items-center rounded-lg px-2 py-0.5 text-[0.8125rem]/6 font-medium text-white/30 transition-colors hover:text-neutral-300 gap-x-2"
                      href="https://github.com/zirojs/ziro"
                    >
                      <span className="absolute inset-0 -z-10 scale-75 rounded-lg bg-white/5 opacity-0 transition group-hover:scale-100 group-hover:opacity-100" />
                      <Github size="16" />
                      <span className="self-baseline text-white">GitHub</span>
                    </a>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 items-end justify-center pb-4 lg:justify-start lg:pb-6">
                <p className="flex items-baseline text-[0.8125rem]/6 text-gray-600">
                  Built on top of
                  <a className="group relative isolate flex items-center rounded-lg px-2  font-medium text-white/40 transition-colors hover:text-neutral-300" href="https://github.com/zirojs/ziro">
                    ۰ Ziro
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative flex-auto">
          <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden lg:right-[calc(max(2rem,50%-38rem)+40rem)] lg:min-w-[32rem] lg:overflow-visible">
            <svg className="absolute left-[max(0px,calc(50%-18.125rem))] top-0 h-full w-1.5 lg:left-full lg:ml-1 xl:left-auto xl:right-1 xl:ml-0" aria-hidden="true">
              <defs>
                <pattern id=":S4:" width={6} height={8} patternUnits="userSpaceOnUse">
                  <path d="M0 0H6M0 8H6" className="stroke-neutral-900/10 xl:stroke-white/10 dark:stroke-white/10" fill="none" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#:S4:)" />
            </svg>
          </div>
          <Outlet />
        </div>
      </Body>
    </Html>
  )
}
