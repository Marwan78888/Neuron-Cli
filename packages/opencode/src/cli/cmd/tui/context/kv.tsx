import { Global } from "@/global"
import { Filesystem } from "@/util"
import { createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import { createSimpleContext } from "./helper"
import path from "path"

export const { use: useKV, provider: KVProvider } = createSimpleContext({
  name: "KV",
  init: () => {
    const [ready, setReady] = createSignal(false)
    const [store, setStore] = createStore<Record<string, any>>()
    const filePath = path.join(Global.Path.state, "kv.json")

    Filesystem.readJson<Record<string, any>>(filePath)
      .then((x) => {
        setStore(x)
      })
      .catch(() => {})
      .finally(() => {
        setReady(true)
      })

    const result = {
      get ready() {
        return ready()
      },
      get store() {
        return store
      },
      signal<T>(name: string, defaultValue: T) {
        if (store[name] === undefined) setStore(name, defaultValue)
        return [
          function (): T {
            return result.get(name, defaultValue) as T
          },
          function setter(next: T | ((prev: T) => T)) {
            const value = typeof next === "function" ? (next as (prev: T) => T)(result.get(name, defaultValue) as T) : next
            result.set(name, value)
          },
        ] as const
      },
      get(key: string, defaultValue?: any) {
        return store[key] ?? defaultValue
      },
      set(key: string, value: any) {
        setStore(key, value)
        void Filesystem.writeJson(filePath, store)
      },
    }
    return result
  },
})
