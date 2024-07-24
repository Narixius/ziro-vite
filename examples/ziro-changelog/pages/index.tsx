export const handler = (context: any, request: any) => {
  // the ssr method that would be called
  return {
    errors: [],
    meta: [
      {
        title: 'Ziro Changelog',
      },
    ],
    context: {
      ok: true,
    },
  }
}

export const allowedMethods = ['GET']

export const Error = ({ data }) => {
  return <div>Something went wrong!</div>
}

export default function HomePage({ data }) {
  const { dispatch, isLoading } = useHandler()

  return (
    <main className="space-y-20 py-20 sm:space-y-32 sm:py-32">
      <article id="commit-message-suggestions" className="scroll-mt-16" style={{ paddingBottom: 0 }}>
        <div>
          <header className="relative mb-10 xl:mb-0">
            <div className="pointer-events-none absolute left-[max(-0.5rem,calc(50%-18.625rem))] top-0 z-50 flex h-4 items-center justify-end gap-x-2 lg:left-0 lg:right-[calc(max(2rem,50%-38rem)+40rem)] lg:min-w-[32rem] xl:h-8">
              <a className="inline-flex" href="#commit-message-suggestions">
                <time dateTime="2023-04-06T00:00:00.000Z" className="hidden xl:pointer-events-auto xl:block xl:text-xs xl:font-medium xl:text-white/50">
                  Apr 6, 2023
                </time>
              </a>
              <div className="h-[0.0625rem] w-3.5 bg-gray-400 lg:-mr-3.5 xl:mr-0 xl:bg-gray-300" />
            </div>
            <div className="mx-auto max-w-7xl px-6 lg:flex lg:px-8">
              <div className="lg:ml-96 lg:flex lg:w-full lg:justify-end lg:pl-32">
                <div className="mx-auto max-w-lg lg:mx-0 lg:w-0 lg:max-w-xl lg:flex-auto">
                  <div className="flex">
                    <a className="inline-flex" href="#commit-message-suggestions">
                      <time dateTime="2023-04-06T00:00:00.000Z" className="text-xs font-medium text-gray-500 xl:hidden dark:text-white/50">
                        Apr 6, 2023
                      </time>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-7xl px-6 lg:flex lg:px-8">
            <div className="lg:ml-96 lg:flex lg:w-full lg:justify-end lg:pl-32">
              <div className="mx-auto max-w-lg lg:mx-0 lg:w-0 lg:max-w-xl lg:flex-auto typography dark:typography-invert text-gray-200" data-mdx-content="true">
                <div className="relative mt-8 overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-900 [&+*]:mt-8">
                  <img alt="" loading="lazy" decoding="async" />
                  <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-gray-900/10 dark:ring-white/10" />
                </div>
                <h2>
                  <a className="no-underline">Commit message suggestions</a>
                </h2>
                <p>
                  In the latest release, I've added support for commit message and description suggestions via an integration with OpenAI. Commit looks at all of your changes, and feeds that into the
                  machine with a bit of prompt-tuning to get back a commit message that does a surprisingly good job at describing the intent of your changes.
                </p>
                <p>
                  It's also been a pretty helpful way to remind myself what the hell I was working on at the end of the day yesterday when I get back to my computer and realize I didn't commit any of
                  my work.
                </p>
                <h3 id="-improvements">Improvements</h3>
                <ul>
                  <li>Added commit message and description suggestions powered by OpenAI</li>
                  <li>Fixed race condition that could sometimes leave you in a broken rebase state</li>
                  <li>Improved active project detection to try and ignore file changes triggered by the system instead of the user</li>
                  <li>Fixed bug that sometimes reported the wrong number of changed files</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </article>
    </main>
  )
}
