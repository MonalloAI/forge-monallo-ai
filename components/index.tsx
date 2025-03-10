"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Header } from "@/components/ui/header"
import { useRouter } from "next/navigation"

export default function Index() {
  const router = useRouter()
  const [data47, setData47] = useState([])
  const [data50, setData50] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const lastUpdatedRef = useRef(new Date())

  const fetchData = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const baseUrl = "http://192.168.31.231:3002/api/worker-data"
      const apiUrl1 = `/api/proxy/worker-data/47`
      const apiUrl2 = `/api/proxy/worker-data/50`

      const [response1, response2] = await Promise.all([
        fetch(apiUrl1, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }),
        fetch(apiUrl2, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }),
      ])
      if (!response1.ok) {
        const errorText = await response1.text().catch(() => "无法获取详细错误信息")
        throw new Error(`API请求失败(47): ${response1.status} - ${errorText || response1.statusText}`)
      }

      if (!response2.ok) {
        const errorText = await response2.text().catch(() => "无法获取详细错误信息")
        throw new Error(`API请求失败(50): ${response2.status} - ${errorText || response2.statusText}`)
      }

      const result1 = await response1.json()
      const result2 = await response2.json()

      console.log("API 47 原始返回数据:", result1)
      console.log("API 50 原始返回数据:", result2)

      if (result1?.data) {
        setData47(result1.data as never[])
      } else if (Array.isArray(result1)) {
        setData47(result1 as never[])
      }

      if (result2?.data) {
        setData50(result2.data as never[])
      } else if (Array.isArray(result2)) {
        setData50(result2 as never[])
      }

      lastUpdatedRef.current = new Date()
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "未知错误"
      setError(errorMessage)
      console.error("获取数据时出错:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData(true)

    const refreshInterval = setInterval(() => {
      fetchData(false)
    }, 240000)

    return () => clearInterval(refreshInterval)
  }, [fetchData])

  const handleAddressClick = (address: string) => {
    router.push(`/address/${address}`)
  }

  const DataList = ({ data, title }: { data: any[]; title: string }) => (
    <div className="bg-white rounded-md shadow-md overflow-hidden relative h-full">
      <div className="flex bg-indigo-600 text-white p-3 font-bold items-center" style={{ height: "80px" }}>
        <div className="w-[8%] pr-0 pl-1">
          <div>No.</div>
        </div>
        <div className="w-[59%] px-2">
          <div>{title}</div>
        </div>
        <div className="w-1/3 px-2 text-right">Value</div>
      </div>

      <div
        className="divide-y divide-gray-200 overflow-auto scrollbar-hide"
        style={{
          maxHeight: "calc(100vh - 260px)",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style jsx>{`
                    div::-webkit-scrollbar {
                        display: none;
                        width: 0;
                    }
                `}</style>

        {Array.isArray(data) && data.length > 0 ? (
          data.map((item, index) => (
            <div
              key={index}
              className={`flex items-center p-3 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
            >
              <div className="w-[8%] pr-0 pl-1">
                <div className="text-xl font-bold text-indigo-600">#{index + 1}</div>
              </div>
              <div className="w-[59%] px-2">
                <div className="font-mono text-sm text-gray-500">worker</div>
                <div
                  className="font-semibold text-gray-800 overflow-hidden text-ellipsis cursor-pointer hover:text-indigo-600 hover:underline"
                  onClick={() => handleAddressClick(item.worker)}
                >
                  {item.worker || "未知worker"}
                </div>
              </div>
              <div className="w-1/3 px-2 text-right">
                <div className="font-mono text-sm text-gray-500">value</div>
                <div className="text-xl font-bold text-indigo-600">
                  {typeof item.value === "number" ? item.value : item.value || "无数据"}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center">没有可显示的数据</div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen ">
      <Header />
      <main className="container mx-auto p-4">
        {loading && (
          <div className="text-white text-center py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white"></div>
            </div>
            <div className="mt-3">正在加载数据...</div>
          </div>
        )}

        {error && <div className="bg-red-500 text-white p-4 rounded-md mb-4">错误: {error}</div>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DataList data={data47} title="Latest Active Set Topic 47: 5 min BTC/USD Price Prediction" />

              <DataList
                data={data50}
                title="Latest Active Set Topic 50: 6h BTC/USD Volatility Prediction (updating every 5 min)"
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

