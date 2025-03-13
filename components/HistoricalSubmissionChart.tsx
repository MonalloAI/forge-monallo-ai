import { useState, useEffect } from "react"
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

interface SubmissionData {
  timestamp: string
  value: number
  topic_id?: number
}

interface ChartData {
  timestamp: string
  value?: number
  topic_id?: number
}

interface Topic {
  id: number
  name: string
}

type TimeRange = "day" | "week" | "month" | "year" | "all"

interface ZoomState {
  refAreaLeft: string | null
  refAreaRight: string | null
  left: string | null
  right: string | null
  top: number | null
  bottom: number | null
  animation: boolean
}

interface HistoricalSubmissionChartProps {
  submissionHistory: SubmissionData[]
  availableTopics: Topic[]
  isLoading: boolean
  onTimeRangeChange?: (range: TimeRange) => void
  onTopicChange?: (topicId: string) => void
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

export function HistoricalSubmissionChart({
  submissionHistory,
  availableTopics,
  isLoading,
  onTimeRangeChange,
  onTopicChange,
}: HistoricalSubmissionChartProps) {
  const [localTopicId, setLocalTopicId] = useState<string>("all")
  const [localTimeRange, setLocalTimeRange] = useState<TimeRange>("day")
  const [filteredData, setFilteredData] = useState<ChartData[]>([])

  // 处理主题变更
  const handleTopicChange = (value: string) => {
    console.log("选择的主题ID:", value)
    setLocalTopicId(value)
    onTopicChange?.(value)
  }

  // 处理时间范围变更
  const handleTimeRangeChange = (range: TimeRange) => {
    console.log("选择的时间范围:", range)
    setLocalTimeRange(range)
    onTimeRangeChange?.(range)
  }

  // 数据过滤逻辑
  useEffect(() => {
    console.log("提交历史数据:", submissionHistory)
    console.log("当前选择的主题:", localTopicId)
    console.log("当前选择的时间范围:", localTimeRange)

    if (!Array.isArray(submissionHistory) || submissionHistory.length === 0) {
      console.log("没有历史数据")
      setFilteredData([])
      return
    }

    try {
      let filtered = submissionHistory.map((item) => ({
        timestamp: item.timestamp,
        value: typeof item.value === 'string' ? parseFloat(item.value) : item.value,
        topic_id: item.topic_id
      }))

      console.log("初始过滤数据:", filtered)

      if (localTopicId !== "all") {
        const topicIdNum = Number.parseInt(localTopicId, 10)
        filtered = filtered.filter((item) => {
          const match = item.topic_id === topicIdNum
          console.log(`数据点 ${item.timestamp} 主题ID匹配: ${match}`)
          return match
        })
      }

      if (localTimeRange !== "all") {
        const now = new Date()
        const startDate = new Date()

        // 重置时间为当天开始
        startDate.setHours(0, 0, 0, 0)
        now.setHours(23, 59, 59, 999)

        switch (localTimeRange) {
          case "day":
            // 保持startDate为今天开始
            break
          case "week":
            // 获取本周的开始（周日为一周的开始）
            const day = startDate.getDay()
            startDate.setDate(startDate.getDate() - day)
            break
          case "month":
            // 设置为本月1号
            startDate.setDate(1)
            break
          case "year":
            // 设置为本年1月1日
            startDate.setMonth(0, 1)
            break
        }

        filtered = filtered.filter((item) => {
          const itemDate = new Date(item.timestamp)
          const isInRange = itemDate >= startDate && itemDate <= now
          console.log(`数据点 ${item.timestamp} 时间范围匹配:`, {
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
            itemDate: itemDate.toISOString(),
            isInRange
          })
          return isInRange
        })
      }

      filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      console.log("最终过滤后的数据:", filtered)
      setFilteredData(filtered)
    } catch (error) {
      console.error("数据处理错误:", error)
      setFilteredData([])
    }
  }, [submissionHistory, localTopicId, localTimeRange])

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-bold mb-4 md:mb-0">Historical submission data</h2>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="w-full md:w-64">
            <Select 
              value={localTopicId} 
              onValueChange={handleTopicChange}
            >
              <SelectTrigger className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 focus:border-blue-500">
                <SelectValue placeholder="选择主题" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg">
                <SelectItem value="all" className="hover:bg-gray-100 cursor-pointer">
                  All topics
                </SelectItem>
                {availableTopics.map((topic) => (
                  <SelectItem 
                    key={topic.id}
                    value={topic.id.toString()}
                    className="hover:bg-gray-100 cursor-pointer"
                  >
                    {topic.name} (ID: {topic.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            {[
              { value: "day", label: "day" },
              { value: "week", label: "week" },
              { value: "month", label: "month" },
              { value: "year", label: "year" },
              { value: "all", label: "all" }
            ].map(({ value, label }) => (
              <Button
                key={value}
                variant={localTimeRange === value ? "default" : "outline"}
                onClick={() => handleTimeRangeChange(value as TimeRange)}
                className={`flex-1 md:flex-none ${
                  localTimeRange === value 
                    ? "bg-blue-500 text-white hover:bg-blue-600" 
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
          </div>
          <div className="mt-3">Historical submission data...</div>
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
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(timestamp) => {
                  const date = new Date(timestamp)
                  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}`
                }}
                type="category"
              />
              <YAxis />
              <Tooltip
                labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                formatter={(value, name, props) => {
                  const data = props.payload
                  const topicInfo = data.topic_id ? ` (topic ID: ${data.topic_id})` : ""
                  return [formatNumber(value as number), `${name}${topicInfo}`]
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 8 }}
                name="Submission value"
              />
              <Brush dataKey="timestamp" height={30} stroke="#3B82F6" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="flex flex-col items-center justify-center">
            <Calendar className="h-12 w-12 text-gray-400 mb-2" />
            <p className="text-gray-500">No data found under current filtering conditions</p>
            {(localTopicId !== "all" || localTimeRange !== "all") && (
              <Button
                variant="outline"
                className="mt-4 hover:bg-gray-100"
                onClick={() => {
                  handleTopicChange("all")
                  handleTimeRangeChange("all")
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 