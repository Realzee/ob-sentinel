'use client'

import { useEffect } from 'react'

export default function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Add skip to main content link for keyboard users
    const skipLink = document.createElement('a')
    skipLink.href = '#main-content'
    skipLink.className = 'skip-to-main-content'
    skipLink.textContent = 'Skip to main content'
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #f59e0b;
      color: black;
      padding: 8px;
      z-index: 10000;
      text-decoration: none;
      border-radius: 4px;
    `
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px'
    })
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px'
    })
    
    document.body.prepend(skipLink)

    return () => {
      skipLink.remove()
    }
  }, [])

  return (
    <>
      {children}
      {/* Add main content landmark */}
      <div id="main-content" tabIndex={-1} style={{ outline: 'none' }} />
    </>
  )
}