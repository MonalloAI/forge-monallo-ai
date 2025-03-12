import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  const address = params.address;
  
  try {
    console.log(`代理请求用户信息 - 地址: ${address}`);
    
    const response = await fetch(
      `http://localhost:3003/api/forge/user/${address}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const data = await response.text();
    console.log(`API响应状态: ${response.status}`);
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('API代理错误:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '从API获取数据失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
} 