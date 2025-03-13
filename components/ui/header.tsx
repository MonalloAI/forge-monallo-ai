import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, Wallet, User, Users, LogOut, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useRouter } from 'next/navigation'

// 添加 Keplr 类型声明
declare global {
  interface Window {
    keplr?: {
      enable: (chainId: string) => Promise<void>;
      getKey: (chainId: string) => Promise<{
        name: string;
        algo: string;
        pubKey: Uint8Array;
        address: string;
        bech32Address: string;
      }>;
      experimentalSuggestChain: (chainInfo: any) => Promise<void>;
    };
  }
}

interface HeaderProps {
  className?: string;
}

// Allora Testnet 网络配置
const CHAIN_ID = "allora-testnet";
const CHAIN_INFO = {
  chainId: CHAIN_ID,
  chainName: "Allora Testnet",
  rpc: "https://testnet-rpc.allora.network",
  rest: "https://testnet-rest.allora.network",
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: "allora",
    bech32PrefixAccPub: "allorapub",
    bech32PrefixValAddr: "alloravaloperpub",
    bech32PrefixValPub: "alloravalpub",
    bech32PrefixConsAddr: "alloraconsaddr",
    bech32PrefixConsPub: "alloraconspub",
  },
  currencies: [
    {
      coinDenom: "ALOT",
      coinMinimalDenom: "ualot",
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: "ALOT",
      coinMinimalDenom: "ualot",
      coinDecimals: 6,
    },
  ],
  stakeCurrency: {
    coinDenom: "ALOT",
    coinMinimalDenom: "ualot",
    coinDecimals: 6,
  },
  gasPriceStep: {
    low: 0.01,
    average: 0.025,
    high: 0.04,
  },
};

export function Header({ className }: HeaderProps) {
  const [account, setAccount] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchAddress, setSearchAddress] = useState('')
  const router = useRouter()

  // 添加地址格式化函数
  const formatAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  // 添加复制地址功能
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(account);
      toast.success('Address copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy address');
    }
  };

  // 添加跳转到个人页面功能
  const goToProfile = () => {
    router.push(`/address/${account}`);
    setIsOpen(false);
  };

  const handleSearch = () => {
    if (searchAddress.trim()) {
      router.push(`/address/${searchAddress.trim()}`);
      setIsSearchOpen(false);
    }
  };

  useEffect(() => {
    const savedAccount = localStorage.getItem('connectedAccount')
    if (savedAccount) {
      setAccount(savedAccount)
    }
  }, [])

  const connectWallet = async () => {
    if (typeof window.keplr === 'undefined') {
      toast.error('请安装 Keplr 钱包')
      window.open('https://www.keplr.app/download', '_blank')
      return
    }

    setIsConnecting(true)
    try {
      // 启用 Keplr 访问
      await window.keplr.enable(CHAIN_ID)
      
      // 获取账户信息
      const key = await window.keplr.getKey(CHAIN_ID)
      const alloraAddress = key.bech32Address
      
      setAccount(alloraAddress)
      localStorage.setItem('connectedAccount', alloraAddress)
      toast.success('连接成功')
    } catch (error) {
      console.error('连接错误:', error)
      toast.error('连接失败，请重试')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleLogout = () => {
    setAccount('')
    localStorage.removeItem('connectedAccount')
    setIsOpen(false)
    toast.success('已退出登录')
  }

  return (
    <header className={`flex items-center justify-center p-4 bg-white border-b border-gray-200 ${className || ''}`}>
      <div className="container mx-auto flex items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <Link href='/' className="flex items-center space-x-4">
            {/* <Image src="/Dew.png" alt="BONESPay logo" width={32} height={32} className="w-8 h-8" /> */}
            <h1 className="text-2xl font-bold ">Monallo</h1>
          </Link>
          <nav className="hidden md:flex space-x-4 border-l">
            {/* <Link href="https://register.deworkhub.com/" className="text-sm font-medium ml-8">Register</Link>
            <Link href="https://scan.platon.network/" className="text-sm font-medium">PlatScan</Link>
            <a href="./pools" className="text-sm font-medium">Pools</a>
            <a href="./event" className="text-sm font-medium">Event</a> */}
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className={`flex items-center space-x-2 transition-all duration-300 ${isSearchOpen ? 'w-64' : 'w-10'}`}>
                {isSearchOpen && (
                    <input 
                        type="text"
                        value={searchAddress}
                        onChange={(e) => setSearchAddress(e.target.value)}
                        placeholder="Search address..."
                        className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 flex-grow"
                    />
                )}
                <button 
                    onClick={() => {
                        if (isSearchOpen && searchAddress.trim()) {
                            handleSearch();
                        } else {
                            setIsSearchOpen(!isSearchOpen);
                        }
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                >
                    <Search className="h-5 w-5 text-gray-600" />
                </button>
            </div>
          </div>
          {account ? (
            <div className="relative">
              <Button 
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2"
              >
                <span className="font-mono">
                  {formatAddress(account)}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
              {isOpen && (
                <div className="absolute right-0 mt-2 w-[400px] bg-white rounded-md shadow-lg py-1 z-10">
                  <div 
                    className="px-4 py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                    onDoubleClick={copyAddress}
                  >
                    <div className="text-sm text-gray-500 flex items-center justify-between">
                      <span>Full Address</span>
                      <span className="text-xs text-gray-400">(Double click to copy)</span>
                    </div>
                    <div className="font-mono text-sm break-all">{account}</div>
                  </div>
                  <div 
                    className="px-2 py-1 hover:bg-purple-50 cursor-pointer"
                    onClick={goToProfile}
                  >
                    <div className="flex items-center gap-2 p-2">
                      <User className="h-4 w-4" />
                      <span>View Profile</span>
                    </div>
                  </div>
                  <div 
                    className="px-2 py-1 hover:bg-purple-50 cursor-pointer text-red-600 border-t border-gray-100"
                    onClick={handleLogout}
                  >
                    <div className="flex items-center gap-2 p-2">
                      <LogOut className="h-4 w-4" />
                      <span>Disconnect</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button 
              size="default" 
              onClick={connectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect Keplr'}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}