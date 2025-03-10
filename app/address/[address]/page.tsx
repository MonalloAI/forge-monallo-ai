"use client"

import { useEffect, useState } from "react";
import { Header } from "@/components/ui/header";
import { useParams } from "next/navigation";

interface TopicInfo {
  topic_id: number;
  topic_name: string;
  worker_count: number;
  reputer_count: number;
  total_emissions_allo: number;
  is_active: boolean;
  epoch_length: number;
  ground_truth_lag: number;
  loss_method: string;
  worker_submission_window: number;
  total_staked_allo: number;
}

interface AddressData {
  allora_address?: string;
  workers_topics?: TopicInfo[];
}

const formatNumber = (num: number): string => {
  if (num < 0.0001 && num !== 0) return num.toExponential(2);
  return num.toLocaleString('en-US', { maximumFractionDigits: 6 });
};

export default function AddressDetail() {
    const params = useParams();
    const address = params.address as string;
    
    const [addressData, setAddressData] = useState<AddressData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rawResponse, setRawResponse] = useState<string | null>(null);
    
    useEffect(() => {
        const fetchAddressInfo = async () => {
            try {
                setLoading(true);
                console.log(`Starting request for address info: ${address}`);

                const apiUrl = `/api/proxy/user-info/${address}`;
                console.log(`API URL: ${apiUrl}`);

                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    cache: 'no-store'
                });
                

                const responseText = await response.text();
                setRawResponse(responseText);
                
                console.log(`API response status: ${response.status}`);
                console.log(`API response content: ${responseText.substring(0, 200)}...`);
                
                if (!response.ok) {
                    throw new Error(`Failed to get address info: ${response.status} - ${responseText}`);
                }
                

                let data;
                try {
                    data = JSON.parse(responseText);
                    console.log("Original parsed JSON data:", data);
                    

                    if (data && data.success === true && data.data) {

                        setAddressData(data.data as AddressData);
                    } else {

                        setAddressData(data as AddressData);
                    }
                    
                    setError(null);
                } catch (e) {
                    console.error("JSON parse failed:", e);
                    throw new Error(`Response is not valid JSON: ${responseText.substring(0, 100)}...`);
                }
                
                console.log("Address details data:", data);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                setError(errorMessage);
                console.error("Failed to get address info:", err);
            } finally {
                setLoading(false);
            }
        };
        
        if (address) {
            fetchAddressInfo();
        }
    }, [address]);
    

    const hasWorkerTopics = addressData && Array.isArray(addressData.workers_topics) && addressData.workers_topics.length > 0;
    const alloraAddress = addressData?.allora_address || address;
    
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
                    <h1 className="text-2xl font-bold mb-4">Address Details</h1>
                    <div className="flex items-center">
                        <div className="font-mono bg-gray-100 p-3 rounded-md text-gray-700 break-all">
                            {address}
                        </div>
                    </div>
                </div>
                
                {loading && (
                    <div className="text-center py-8">
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
                        </div>
                        <div className="mt-3">Loading address information...</div>
                    </div>
                )}
                
                {error && (
                    <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
                        <div className="font-bold">Error:</div> 
                        <div>{error}</div>

                        <div className="mt-4 p-2 bg-gray-100 rounded-md">
                            <div>API请求失败，可能是由于CORS限制。请尝试：</div>
                            <ol className="list-decimal ml-5 mt-2">
                                <li>检查API服务器是否启用了CORS</li>
                                <li>使用服务器端API代理</li>
                                <li>直接在浏览器中访问以下链接测试API是否可用：</li>
                            </ol>
                            <a 
                                href={`http://localhost/api/user-info/${address}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 underline block mt-2"
                            >
                                http://localhost/api/user-info/{address}
                            </a>
                        </div>
                    </div>
                )}
                
                {rawResponse && !addressData && !loading && (
                    <div className="bg-yellow-100 text-yellow-800 p-4 rounded-md mb-4">
                        <div className="font-bold">Response received but couldn't parse correctly:</div>
                        <pre className="mt-2 overflow-auto p-2 bg-gray-100 rounded-md text-sm" style={{maxHeight: '200px'}}>
                            {rawResponse}
                        </pre>
                    </div>
                )}
                
                {!loading && !error && addressData && (
                    <>
                        {hasWorkerTopics ? (
                            <>
                                <h2 className="text-xl font-bold mb-4">
                                    Participating Topics ({addressData.workers_topics!.length})
                                </h2>
                                <div className="grid grid-cols-1 gap-6">
                                    {addressData.workers_topics!.map((topic) => (
                                        <div key={topic.topic_id} className="bg-white rounded-lg shadow-md overflow-hidden">
                                            <div className="bg-indigo-600 text-white p-4">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-bold text-lg">{topic.topic_name}</h3>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${topic.is_active ? 'bg-green-500' : 'bg-gray-500'}`}>
                                                        {topic.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                                <div className="text-sm opacity-80">Topic ID: {topic.topic_id}</div>
                                            </div>
                                            
                                            <div className="p-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <div className="text-sm text-gray-500">Worker Count</div>
                                                            <div className="font-semibold text-lg">{topic.worker_count}</div>
                                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min(topic.worker_count/200*100, 100)}%` }}></div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div>
                                                            <div className="text-sm text-gray-500">Reputer Count</div>
                                                            <div className="font-semibold text-lg">{topic.reputer_count}</div>
                                                        </div>
                                                        
                                                        <div>
                                                            <div className="text-sm text-gray-500">Total Emissions (ALLO)</div>
                                                            <div className="font-semibold text-lg">{formatNumber(topic.total_emissions_allo)}</div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-4">
                                                        <div>
                                                            <div className="text-sm text-gray-500">Loss Method</div>
                                                            <div className="font-semibold uppercase">{topic.loss_method}</div>
                                                        </div>
                                                        
                                                        <div>
                                                            <div className="text-sm text-gray-500">Epoch Length</div>
                                                            <div className="font-semibold">{topic.epoch_length}</div>
                                                        </div>
                                                        
                                                        <div>
                                                            <div className="text-sm text-gray-500">Ground Truth Lag</div>
                                                            <div className="font-semibold">{topic.ground_truth_lag}</div>
                                                        </div>
                                                        
                                                        <div>
                                                            <div className="text-sm text-gray-500">Total Staked</div>
                                                            <div className="font-semibold">{formatNumber(topic.total_staked_allo)} ALLO</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="bg-white rounded-lg shadow-md p-6 text-center">
                                <p className="text-gray-500">This address is not participating in any topics</p>
                            </div>
                        )}
                    </>
                )}
                
                {!loading && !addressData && !error && (
                    <div className="bg-white rounded-lg shadow-md p-6 text-center">
                        <p className="text-gray-500">No data found for this address</p>
                    </div>
                )}
            </main>
        </div>
    );
} 