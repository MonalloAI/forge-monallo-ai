"use client"

import { useEffect, useState, useCallback } from "react"
import { Header } from "@/components/ui/header"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { toast } from "react-hot-toast"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  Brush,
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar, RefreshCw } from "lucide-react"

interface UserProfile {
  first_name: string
  last_name: string
  username: string
  cosmos_address: string
  total_points: number
  ranking: number
  badge_name: string
  badge_description: string
  competitions: {
    id: number
    name: string
    topic_id: number
    prize_pool: number
    start_date: string
    end_date: string
    ranking: number
    points: number
    score: number
  }[]
}

interface AddressData {
  success: boolean
  data: UserProfile
}

interface SubmissionData {
  timestamp: string
  value: number
  topic_id?: number
}

interface CombinedChartData {
  timestamp: string
  value?: number
  topic_id?: number
}

type TimeRange = "day" | "month" | "year" | "all"

interface ZoomState {
  refAreaLeft: string | null
  refAreaRight: string | null
  left: string | null
  right: string | null
  top: number | null
  bottom: number | null
  animation: boolean
}

const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return "0"

  if (Math.abs(num) < 0.0001 && num !== 0) {

    return num.toFixed(6).replace(/\.?0+$/, "")
  }


  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })
}

export default function AddressDetail() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const address = params.address as string


  const currentTopicId = searchParams.get("topic_id") || "all"
  const currentTimeRange = (searchParams.get("timeRange") || "day") as TimeRange

  const [localTopicId, setLocalTopicId] = useState(currentTopicId)
  const [localTimeRange, setLocalTimeRange] = useState<TimeRange>(currentTimeRange as TimeRange)
  const [userData, setUserData] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [submissionHistory, setSubmissionHistory] = useState<SubmissionData[]>([])
  const [filteredData, setFilteredData] = useState<CombinedChartData[]>([])
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [availableTopics, setAvailableTopics] = useState<{ id: number; name: string }[]>([])
  const MAX_RETRIES = 3
  const RETRY_DELAY = 3000

  const [zoom, setZoom] = useState<ZoomState>({
    refAreaLeft: null,
    refAreaRight: null,
    left: null,
    right: null,
    top: null,
    bottom: null,
    animation: true,
  })

  const updateUrlParams = (topicId: string, timeRange: TimeRange) => {

    setLocalTopicId(topicId)
    setLocalTimeRange(timeRange)

    const params = new URLSearchParams(searchParams.toString())
    params.set("topic_id", topicId)
    params.set("timeRange", timeRange)

    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.pushState({ path: newUrl }, "", newUrl)
  }

  const handleTopicChange = (value: string) => {
    updateUrlParams(value, localTimeRange)
  }

  const handleTimeRangeChange = (range: TimeRange) => {
    updateUrlParams(localTopicId, range)
  }

  const fetchAddressInfo = async (retryAttempt = 0) => {
    try {
      setLoading(true)
      console.log(`开始获取用户信息: ${address}, 重试次数: ${retryAttempt}`)

      const apiUrl = `/api/proxy/user-info/${address}`
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`获取用户信息失败: ${response.status}`)
      }

      const data = await response.json()

      if (data && data.success === true && data.data) {
        setUserData(data.data)

        if (data.data.competitions && data.data.competitions.length > 0) {
          // 使用Map来确保每个topic_id只出现一次
          const topicsMap = new Map()
          data.data.competitions.forEach((comp) => {
            if (!topicsMap.has(comp.topic_id)) {
              topicsMap.set(comp.topic_id, {
                id: comp.topic_id,
                name: comp.name,
              })
            }
          })

     
          const uniqueTopics = Array.from(topicsMap.values())
          setAvailableTopics(uniqueTopics)
        }

        setError(null)
        setRetryCount(0)
      } else {
        throw new Error("无效的数据格式")
      }
    } catch (err) {
      console.error("获取用户信息失败:", err)

      if (retryAttempt < MAX_RETRIES) {
        toast.error("获取用户信息失败，正在重试...", {
          duration: RETRY_DELAY - 1000,
        })

        
        setRetryCount(retryAttempt + 1)

        setTimeout(() => {
          fetchAddressInfo(retryAttempt + 1)
        }, RETRY_DELAY)
      } else {
        toast.error("获取用户信息失败，请稍后再试", {
          duration: 3000,
        })
        setError("获取用户信息失败")
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchSubmissionHistory = useCallback(async () => {
    if (isHistoryLoaded) return

    setIsHistoryLoading(true)

    try {
      console.log("Fetching submission history for address:", address)

      // 从API获取数据
      const response = await fetch(`http://localhost:3005/api/workers/${address}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch submission history: ${response.status}`)
      }

      const responseData = await response.json()
      console.log("Received submission history data:", responseData)

      if (responseData && responseData.success === true && Array.isArray(responseData.data)) {

        const formattedData = responseData.data.map((item) => ({
          timestamp: item.timestamp || new Date().toISOString(),
          value:
            typeof item.value === "number"
              ? item.value
              : typeof item.value === "string"
                ? Number.parseFloat(item.value)
                : 0,
          topic_id: item.topic_id || undefined,
        }))

        console.log("Formatted submission history data:", formattedData)
        setSubmissionHistory(formattedData)
        setIsHistoryLoaded(true)
      } else {
        console.warn("API returned invalid data format:", responseData)
        toast.error("Invalid data format received from server")
        setSubmissionHistory([])
      }
    } catch (error) {
      console.error("Error fetching submission history:", error)
      toast.error("Failed to load submission history")
      setSubmissionHistory([])
    } finally {
      setIsHistoryLoading(false)
    }
  }, [address, isHistoryLoaded])


  useEffect(() => {
    if (submissionHistory.length === 0) return

    let combined: CombinedChartData[] = submissionHistory.map((item) => ({
      timestamp: item.timestamp,
      value: item.value,
      topic_id: item.topic_id
    }))

    combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    
    setFilteredData(combined)
  }, [submissionHistory])

  useEffect(() => {
    if (!filteredData.length) return

    let filtered = [...filteredData]


    if (localTopicId !== "all") {
      const topicIdNum = Number.parseInt(localTopicId, 10)
      filtered = filtered.filter((item) => item.topic_id === topicIdNum)
    }

    if (localTimeRange !== "all") {
      const now = new Date()
      const cutoffDate = new Date()

      switch (localTimeRange) {
        case "day":
          cutoffDate.setDate(now.getDate() - 1)
          break
        case "month":
          cutoffDate.setMonth(now.getMonth() - 1)
          break
        case "year":
          cutoffDate.setFullYear(now.getFullYear() - 1)
          break
      }

      filtered = filtered.filter((item) => new Date(item.timestamp) >= cutoffDate)
    }


    filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    setFilteredData(filtered)
  }, [filteredData.length, localTopicId, localTimeRange])


  useEffect(() => {
    let ws: WebSocket | null = null

    const initializeData = async () => {
      if (!userData) {
        await fetchAddressInfo()
      }
      await fetchSubmissionHistory()

    
      try {
        ws = new WebSocket("ws://localhost:3005")

        ws.onopen = () => {
          console.log("WebSocket connection established")
        }

        ws.onmessage = (event) => {
          try {
            const newData = JSON.parse(event.data)
            console.log("WebSocket received new data:", newData)
            if (newData.address === address) {
              const formattedData = {
                timestamp: newData.timestamp || new Date().toISOString(),
                value:
                  typeof newData.value === "number"
                    ? newData.value
                    : typeof newData.value === "string"
                      ? Number.parseFloat(newData.value)
                      : 0,
                topic_id: newData.topic_id || undefined,
              }
              console.log("Adding new data point to chart:", formattedData)
              setSubmissionHistory((prev) => [...prev, formattedData])
            }
          } catch (error) {
            console.error("Error processing WebSocket message:", error)
          }
        }

        ws.onerror = () => {
          console.error("WebSocket connection error - real-time updates disabled")

          if (ws) {
            ws.close()
            ws = null
          }
        }

        ws.onclose = () => {
          console.log("WebSocket connection closed")
        }
      } catch (error) {
        console.log("WebSocket initialization failed - real-time updates disabled")
      }
    }

    initializeData()

    return () => {
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close()
      }
    }
  }, [address, fetchSubmissionHistory, userData])


  useEffect(() => {
    setLocalTopicId(currentTopicId)
    setLocalTimeRange(currentTimeRange as TimeRange)
  }, [])

  const handleMouseDown = (e: any) => {
    if (!e || !e.activeLabel) return
    setZoom({
      ...zoom,
      refAreaLeft: e.activeLabel,
    })
  }

  const handleMouseMove = (e: any) => {
    if (!e || !e.activeLabel) return
    if (zoom.refAreaLeft) {
      setZoom({
        ...zoom,
        refAreaRight: e.activeLabel,
      })
    }
  }

  const handleMouseUp = () => {
    if (!zoom.refAreaLeft || !zoom.refAreaRight) {
      setZoom({
        ...zoom,
        refAreaLeft: null,
        refAreaRight: null,
      })
      return
    }

    let left = zoom.refAreaLeft
    let right = zoom.refAreaRight

    if (new Date(left).getTime() > new Date(right).getTime()) {
      ;[left, right] = [right, left]
    }

    const zoomedData = filteredData.filter(
      (item) => new Date(item.timestamp) >= new Date(left!) && new Date(item.timestamp) <= new Date(right!),
    )

    if (zoomedData.length > 0) {
      let minValue = Number.POSITIVE_INFINITY
      let maxValue = Number.NEGATIVE_INFINITY

      zoomedData.forEach((item) => {
        if (item.value !== undefined && item.value < minValue) minValue = item.value
        if (item.value !== undefined && item.value > maxValue) maxValue = item.value
      })

      // 添加一些边距
      const padding = (maxValue - minValue) * 0.1

      setZoom({
        ...zoom,
        refAreaLeft: null,
        refAreaRight: null,
        left,
        right,
        top: maxValue + padding,
        bottom: Math.max(0, minValue - padding),
        animation: true,
      })
    }
  }

  const resetZoom = () => {
    setZoom({
      refAreaLeft: null,
      refAreaRight: null,
      left: null,
      right: null,
      top: null,
      bottom: null,
      animation: true,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto p-4">
        <div className="mb-4 flex justify-between items-center">
          <button
            onClick={() => window.history.back()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Back
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">User Profile</h1>
          <div className="flex items-center mb-4">
            <div className="font-mono bg-gray-100 p-3 rounded-md text-gray-700 break-all">{address}</div>
          </div>

          {userData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Username</div>
                  <div className="font-semibold text-lg">{userData.username || "Not set"}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Name</div>
                  <div className="font-semibold text-lg">
                    {userData.first_name || userData.last_name
                      ? `${userData.first_name || ""} ${userData.last_name || ""}`.trim()
                      : "Not set"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Points</div>
                  <div className="font-semibold text-lg">
                    {userData.total_points ? formatNumber(userData.total_points) : "0"}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Ranking</div>
                  <div className="font-semibold text-lg">
                    {userData.ranking > 0 ? `#${userData.ranking}` : "Not ranked yet"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Badge</div>
                  <div className="font-semibold text-lg">{userData.badge_name || "No badge yet"}</div>
                  <div className="text-sm text-gray-600">
                    {userData.badge_description || "Start contributing to earn badges"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
            <div className="mt-3">
              {retryCount > 0
                ? `Loading user information... (Retry ${retryCount}/${MAX_RETRIES})`
                : "Loading user information..."}
            </div>
          </div>
        )}

        {userData && userData.competitions && userData.competitions.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Competitions ({userData.competitions.length})</h2>
            <div className="grid grid-cols-1 gap-6">
              {userData.competitions
                .filter((competition) => competition.ranking > 0)
                .map((competition) => (
                  <div key={competition.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{competition.name}</h3>
                        <div className="text-sm text-gray-500">Topic ID: {competition.topic_id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Prize Pool</div>
                        <div className="font-semibold">{formatNumber(competition.prize_pool)} ALLO</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Start Date</div>
                        <div className="font-semibold">{new Date(competition.start_date).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">End Date</div>
                        <div className="font-semibold">{new Date(competition.end_date).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Ranking</div>
                        <div className="font-semibold">#{competition.ranking}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Score</div>
                        <div className="font-semibold">{formatNumber(competition.score)}</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : userData ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-gray-500">
              <p className="mb-2">You are not contributing to any topics yet</p>
              <a href="https://docs.allora.network/home/explore">Explore Allora</a>
            </div>
          </div>
        ) : null}

        {!loading && !userData && !error && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-500">No user data found for this address</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h2 className="text-xl font-bold mb-4 md:mb-0">Historical Submission Data</h2>

            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <div className="w-full md:w-64">
                <Select value={localTopicId} onValueChange={handleTopicChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    {availableTopics.map((topic, index) => (
                      <SelectItem key={`topic-${topic.id}-${index}`} value={topic.id.toString()}>
                        {topic.name} (ID: {topic.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              <div className="flex gap-2">
                <Button
                  variant={localTimeRange === "day" ? "default" : "outline"}
                  onClick={() => handleTimeRangeChange("day")}
                  className="flex-1 md:flex-none"
                >
                  Day
                </Button>
                <Button
                  variant={localTimeRange === "month" ? "default" : "outline"}
                  onClick={() => handleTimeRangeChange("month")}
                  className="flex-1 md:flex-none"
                >
                  Month
                </Button>
                <Button
                  variant={localTimeRange === "year" ? "default" : "outline"}
                  onClick={() => handleTimeRangeChange("year")}
                  className="flex-1 md:flex-none"
                >
                  Year
                </Button>
                <Button
                  variant={localTimeRange === "all" ? "default" : "outline"}
                  onClick={() => handleTimeRangeChange("all")}
                  className="flex-1 md:flex-none"
                >
                  All
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={resetZoom}
              disabled={!zoom.left && !zoom.right}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" /> Reset Zoom
            </Button>
          </div>

          {isHistoryLoading ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
              </div>
              <div className="mt-3">Loading submission history...</div>
            </div>
          ) : filteredData.length > 0 ? (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={filteredData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 20,
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    domain={zoom.left && zoom.right ? [zoom.left, zoom.right] : ["auto", "auto"]}
                    tickFormatter={(timestamp) => {
                      const date = new Date(timestamp)
                      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}`
                    }}
                    type="category"
                    allowDataOverflow
                  />
                  <YAxis
                    domain={zoom.top && zoom.bottom ? [zoom.bottom, zoom.top] : ["auto", "auto"]}
                    allowDataOverflow
                  />
                  <Tooltip
                    labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                    formatter={(value, name, props) => {
                      const data = props.payload
                      const topicInfo = data.topic_id ? ` (Topic ID: ${data.topic_id})` : ""
                      return [formatNumber(value as number), `${name}${topicInfo}`]
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 8 }}
                    name="Submission Value"
                    isAnimationActive={zoom.animation}
                  />
                  {zoom.refAreaLeft && zoom.refAreaRight && (
                    <ReferenceArea
                      x1={zoom.refAreaLeft}
                      x2={zoom.refAreaRight}
                      strokeOpacity={0.3}
                      fill="#8884d8"
                      fillOpacity={0.3}
                    />
                  )}
                  <Brush dataKey="timestamp" height={30} stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="flex flex-col items-center justify-center">
                <Calendar className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-gray-500">No submission data available for the selected filters</p>
                {localTopicId !== "all" || localTimeRange !== "all" ? (
                  <Button variant="outline" className="mt-4" onClick={() => updateUrlParams("all", "all")}>
                    Clear Filters
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

