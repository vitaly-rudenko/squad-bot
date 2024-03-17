import { useEffect, useState } from 'react'

export const useInitialization = (effect: () => true | undefined | (() => void), deps: React.DependencyList) => {
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized) return

    const result = effect()
    if (result === undefined) return

    setInitialized(true)

    return result === true ? undefined : result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, effect, ...deps])

  return initialized
}

