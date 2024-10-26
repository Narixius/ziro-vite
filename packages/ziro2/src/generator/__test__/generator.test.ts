import { globSync } from 'tinyglobby'
import { describe, expect, it, vi } from 'vitest'
import { generateManifest } from '../manifest'
import { generateRoutesTypings } from '../router-types'
import { generateServerRouterCode } from '../server-router'
import * as babelHelpers from '../utils/babel-utils'
import { getRouteFileInfo } from '../utils/es-module-lexer'
import { findRouteFiles } from '../utils/route-files-utils'

vi.mock('tinyglobby', () => ({
  globSync: vi.fn(),
}))

describe('findRouteFiles', () => {
  const mockOptions = {
    cwd: '/somewhere/cwd/',
    pagesPath: 'pages',
  }

  it('should return route files that are route related', () => {
    const mockFiles = ['/somewhere/cwd/pages/index.tsx', '/somewhere/cwd/pages/about.tsx', '/somewhere/cwd/pages/contact.tsx']
    const filteredFiles = ['/somewhere/cwd/pages/index.tsx']
    vi.mocked(globSync).mockReturnValue(mockFiles)
    const result = findRouteFiles(mockOptions)
    expect(result).toEqual(filteredFiles)
  })

  it('should return an empty array if no route related files are found', () => {
    const mockFiles = ['/somewhere/cwd/pages/about.tsx', '/somewhere/cwd/pages/contact.tsx']
    const filteredFiles: string[] = []
    vi.mocked(globSync).mockReturnValue(mockFiles)
    const result = findRouteFiles(mockOptions)
    expect(result).toEqual(filteredFiles)
  })

  it('should include files with _layout in the filename', () => {
    const mockFiles = ['/somewhere/cwd/pages/_layout.tsx', '/somewhere/cwd/pages/contact.tsx']
    const filteredFiles = ['/somewhere/cwd/pages/_layout.tsx']
    vi.mocked(globSync).mockReturnValue(mockFiles)
    const result = findRouteFiles(mockOptions)
    expect(result).toEqual(filteredFiles)
  })

  it('should include files with _root in the filename', () => {
    const mockFiles = ['/somewhere/cwd/pages/root.tsx', '/somewhere/cwd/pages/contact.tsx']
    const filteredFiles = ['/somewhere/cwd/pages/root.tsx']
    vi.mocked(globSync).mockReturnValue(mockFiles)
    const result = findRouteFiles(mockOptions)
    expect(result).toEqual(filteredFiles)
  })

  it('should include files with dynamic routes (colon in the filename)', () => {
    const mockFiles = ['/somewhere/cwd/pages/:id.tsx', '/somewhere/cwd/pages/contact.tsx']
    const filteredFiles = ['/somewhere/cwd/pages/:id.tsx']
    vi.mocked(globSync).mockReturnValue(mockFiles)
    const result = findRouteFiles(mockOptions)
    expect(result).toEqual(filteredFiles)
  })
})

describe('getPageModuleInfo', () => {
  it('should correctly identify module exports', async () => {
    const mockFilepath = '/somewhere/cwd/pages/index.tsx'
    vi.spyOn(babelHelpers, 'transformModuleToESM').mockReturnValue({
      code: `
			export default function Component() {}
			export const actions = {}
			export const loader = () => {}
			export const meta = {}
			export function Loading() {}
			export function ErrorBoundary() {}
			export const middlewares = []
		`,
    })
    const result = await getRouteFileInfo(mockFilepath)
    expect(result).toEqual({
      filepath: mockFilepath,
      hasComponent: true,
      hasActions: true,
      hasLoader: true,
      hasMeta: true,
      index: true,
      hasLoadingComponent: true,
      hasErrorBoundary: true,
      hasMiddleware: true,
    })
  })

  it('should handle modules with no exports', async () => {
    const mockFilepath = '/somewhere/cwd/pages/empty.tsx'
    vi.spyOn(babelHelpers, 'transformModuleToESM').mockReturnValue({
      code: ``,
    })
    const result = await getRouteFileInfo(mockFilepath)
    expect(result).toEqual({
      filepath: mockFilepath,
      hasComponent: false,
      hasActions: false,
      hasLoader: false,
      hasMeta: false,
      index: true,
      hasLoadingComponent: false,
      hasErrorBoundary: false,
      hasMiddleware: false,
    })
  })
})

describe('generateManifest', () => {
  it('should generate a manifest with custom options', async () => {
    const mockOptions = {
      cwd: '/somewhere/cwd/',
      pagesPath: 'pages',
    }
    const mockFiles = [
      '/somewhere/cwd/pages/root.tsx',
      '/somewhere/cwd/pages/index.tsx',
      '/somewhere/cwd/pages/_layout.tsx',
      '/somewhere/cwd/pages/blog/index.tsx',
      '/somewhere/cwd/pages/blog/_layout.tsx',
      '/somewhere/cwd/pages/blog/:slug.tsx',
      '/somewhere/cwd/pages/blog/admin/rest/:slug.tsx',
    ]
    vi.mocked(globSync).mockReturnValue(mockFiles)
    const result = await generateManifest(mockOptions)
    expect(result['/root']).toEqual({
      id: '/root',
      parentId: undefined,
      routeInfo: expect.any(Object),
    })
    expect(result['/_layout']).toEqual({
      id: '/_layout',
      parentId: '/root',
      routeInfo: expect.any(Object),
    })
    expect(result['/']).toEqual({
      id: '/',
      parentId: '/_layout',
      routeInfo: expect.any(Object),
    })
    expect(result['/blog/_layout']).toEqual({
      id: '/blog/_layout',
      parentId: '/_layout',
      routeInfo: expect.any(Object),
    })
    expect(result['/blog']).toEqual({
      id: '/blog',
      parentId: '/blog/_layout',
      routeInfo: expect.any(Object),
    })
    expect(result['/blog/:slug']).toEqual({
      id: '/blog/:slug',
      parentId: '/blog/_layout',
      routeInfo: expect.any(Object),
    })
    expect(result['/blog/admin/rest/:slug']).toEqual({
      id: '/blog/admin/rest/:slug',
      parentId: '/blog/_layout',
      routeInfo: expect.any(Object),
    })
  })
})

describe('generated codes from manifest', () => {
  it('should generate server router file with correct imports and code', async () => {
    const mockOptions = {
      cwd: '/somewhere/cwd/',
      pagesPath: 'pages',
    }
    const mockFiles = [
      '/somewhere/cwd/pages/root.tsx',
      '/somewhere/cwd/pages/index.tsx',
      '/somewhere/cwd/pages/_layout.tsx',
      '/somewhere/cwd/pages/blog/index.tsx',
      '/somewhere/cwd/pages/blog/_layout.tsx',
      '/somewhere/cwd/pages/blog/:slug.tsx',
      '/somewhere/cwd/pages/blog/admin/rest/:slug.tsx',
    ]
    vi.mocked(globSync).mockReturnValue(mockFiles)
    const manifest = await generateManifest(mockOptions)
    const result = await generateServerRouterCode('/somewhere/cwd/.ziro/', manifest)
    expect(result).toContain('const router = new Router()')
    expect(result).toContain('new Route("/root",')
    expect(result).toContain('new Route("/",')
    expect(result).toContain('new Route("/blog/_layout",')
    expect(result).toContain('new Route("/blog",')
    expect(result).toContain('new Route("/blog/:slug",')
    expect(result).toContain('new Route("/blog/admin/rest/:slug",')
  })

  it('should generate route typings with correct imports and code', async () => {
    const mockOptions = {
      cwd: '/somewhere/cwd/',
      pagesPath: 'pages',
    }
    const mockFiles = [
      '/somewhere/cwd/pages/root.tsx',
      '/somewhere/cwd/pages/index.tsx',
      '/somewhere/cwd/pages/_layout.tsx',
      '/somewhere/cwd/pages/blog/index.tsx',
      '/somewhere/cwd/pages/blog/_layout.tsx',
      '/somewhere/cwd/pages/blog/:slug.tsx',
      '/somewhere/cwd/pages/blog/admin/rest/:slug.tsx',
    ]
    vi.mocked(globSync).mockReturnValue(mockFiles)
    const manifest = await generateManifest(mockOptions)
    const result = await generateRoutesTypings('/somewhere/cwd/.ziro/', manifest)
    expect(result).toContain(`declare module 'ziro2/router'`)
    expect(result).toContain(`"/root": Route<"/root", {}, {}, [], undefined>`)
    expect(result).toContain(`"/": Route<"/", {}, {}, [], RoutesByRouteId["/_layout"]>`)
    expect(result).toContain(`"/_layout": Route<"/_layout", {}, {}, [], RoutesByRouteId["/root"]>`)
    expect(result).toContain(`"/blog/_layout": Route<"/blog/_layout", {}, {}, [], RoutesByRouteId["/_layout"]>`)
    expect(result).toContain(`"/blog/:slug": Route<"/blog/:slug", {}, {}, [], RoutesByRouteId["/blog/_layout"]>`)
    expect(result).toContain(`"/blog/admin/rest/:slug": Route<"/blog/admin/rest/:slug", {}, {}, [], RoutesByRouteId["/blog/_layout"]>`)
  })
})
