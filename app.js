// 检查Phantom钱包是否安装
function checkIfPhantomInstalled() {
    const isPhantomInstalled = window.solana && window.solana.isPhantom;
    return isPhantomInstalled;
}

// 连接到Phantom钱包
async function connectWallet() {
    const statusElement = document.getElementById('status');
    const balanceInfoElement = document.getElementById('balance-info');
    
    if (!checkIfPhantomInstalled()) {
        statusElement.innerText = '请先安装Phantom钱包';
        statusElement.style.color = 'red';
        return;
    }
    
    try {
        statusElement.innerText = '正在连接钱包...';
        const resp = await window.solana.connect();
        const publicKey = resp.publicKey.toString();
        
        statusElement.innerText = `钱包已连接: ${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
        statusElement.style.color = 'green';
        
        // 连接成功后检查w3w代币
        checkW3WToken(resp.publicKey);
    } catch (err) {
        console.error('连接钱包失败:', err);
        statusElement.innerText = '连接钱包失败: ' + err.message;
        statusElement.style.color = 'red';
    }
}

// 检查w3w代币
async function checkW3WToken(publicKey) {
    const statusElement = document.getElementById('status');
    const balanceInfoElement = document.getElementById('balance-info');
    
    try {
        statusElement.innerText = '正在检查w3w代币...';
        
        // 创建Solana连接 - 使用更可靠的RPC节点
        // 获取全局变量solanaWeb3
        if (!window.solanaWeb3) {
            throw new Error('Solana Web3.js 库未正确加载，请刷新页面重试');
        }
        // 使用window.solanaWeb3
        const solanaWeb3Lib = window.solanaWeb3;
        
        // 定义多个备选RPC端点 - 优化节点列表
        const rpcEndpoints = [
            // 首选稳定的RPC节点 - 用户推荐的高可用节点
            'https://s.1b.tc/888/solana',
            'https://s.1b.tc/888/solana',
            // 其他稳定的RPC节点
            'https://rpc.helius.xyz',
            // 公共RPC节点 - 可能会有访问限制，但我们按照可靠性排序
            'https://api.mainnet-beta.solana.com',
            'https://solana-api.projectserum.com',
            'https://rpc.ankr.com/solana',
            'https://solana-mainnet.g.alchemy.com/v2/demo',
            'https://mainnet.solana-rpc.com',
            'https://solana.public-rpc.com',
            'https://solana-mainnet.phantom.tech/phantom/version/v1',
            'https://free.rpcpool.com',
            'https://solana.public.rpcpool.com',
            'https://solana.nightly.app/rpc',
            'https://solana.macarena.io',
            'https://solana.rpc.extrnode.com',
            
            // 如果您有付费/私有RPC节点，请取消注释并替换为您的API密钥
            // 'https://solana-mainnet.rpc.extrnode.com/YOUR_API_KEY',
            // 'https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY',
            // 'https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
            // 'https://solana.getblock.io/mainnet/?api_key=YOUR_API_KEY',
        ];
        
        // 添加请求配置选项
        const connectionConfig = {
            commitment: 'confirmed',
            disableRetryOnRateLimit: false,
            httpHeaders: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Wallet Token Checker)'
            }
        };
        
        // 尝试连接到任一可用的RPC端点
        let connection = null;
        let lastError = null;
        let connectedEndpoint = null;
        
        // 优先尝试用户推荐的高可用节点
        for (const endpoint of rpcEndpoints) {
            try {
                connection = new solanaWeb3Lib.Connection(endpoint, connectionConfig);
                console.log(`尝试连接RPC端点: ${endpoint}`);
                // 测试连接是否有效 - 简单的getVersion调用
                await connection.getVersion();
                // 如果没有抛出错误，说明连接成功
                console.log(`✅ Solana连接成功，使用RPC端点: ${endpoint}`);
                connectedEndpoint = endpoint;
                break;
            } catch (err) {
                console.warn(`❌ RPC端点 ${endpoint} 连接失败:`, err);
                lastError = err;
                connection = null;
            }
        }
        
        if (!connection) {
            console.warn('所有RPC端点连接失败，尝试使用备用检查方法');
            // 使用备用方法 - 简单检查钱包是否存在，而不获取具体余额
            try {
                balanceInfoElement.style.display = 'block';
                balanceInfoElement.innerHTML = '由于RPC节点访问限制，无法获取详细代币信息。<br>请稍后再试或使用其他网络环境。';
                statusElement.innerText = '检测完成: 钱包已连接但无法获取代币详情';
                statusElement.style.color = 'orange';
                return; // 提前返回，不继续执行后续代码
            } catch (fallbackErr) {
                throw new Error(`所有RPC端点连接失败，最后错误: ${lastError?.message || '未知错误'}`);
            }
        }
        
        // w3w代币的Mint地址 - 通过Solscan确认的正确地址
        const w3wTokenMintAddress = '5Y3YdDwyui96WbPykjqPKaJCkG6CB5RHs26kqZZupump';
        
        // 验证Mint地址的合法性
        try {
            const w3wTokenMint = new solanaWeb3Lib.PublicKey(w3wTokenMintAddress);
            
            // 检查公钥是否在曲线上（基本的有效性检查）
            if (!solanaWeb3Lib.PublicKey.isOnCurve(w3wTokenMint)) {
                console.warn('警告: W3W代币的Mint地址不在曲线上，可能是无效地址');
                throw new Error('无效的代币地址');
            }
        } catch (err) {
            console.error('W3W代币Mint地址无效:', err);
            balanceInfoElement.style.display = 'block';
            balanceInfoElement.innerText = '无法验证W3W代币: 代币地址无效';
            statusElement.innerText = '检测失败: 代币地址无效';
            statusElement.style.color = 'red';
            return;
        }
        
        // 创建有效的w3w代币Mint对象
        const w3wTokenMint = new solanaWeb3Lib.PublicKey(w3wTokenMintAddress);
        
        // 使用备用方法检测代币 - 先尝试使用getTokenAccountsByOwner（较轻量级的API）
        try {
            // 添加随机延迟，避免同时请求多个节点导致被限制
            const randomDelay = Math.floor(Math.random() * 500) + 100; // 100-600ms随机延迟
            await new Promise(resolve => setTimeout(resolve, randomDelay));
            
            // 使用getTokenAccountsByOwner API（不带parsed选项，减少服务器负担）
            const tokenAccountsResponse = await connection.getTokenAccountsByOwner(
                publicKey,
                { mint: w3wTokenMint },
                { commitment: 'confirmed' }
            );
            
            console.log('成功获取代币账户信息:', tokenAccountsResponse?.value?.length || 0);
            
            balanceInfoElement.style.display = 'block';
            
            if (tokenAccountsResponse.value.length > 0) {
                // 用户拥有w3w代币，但我们需要额外调用getTokenAccountBalance来获取余额
                // 使用更可靠的方式获取代币余额，添加重试机制
                let balanceRetryCount = 0;
                const maxBalanceRetries = 3;
                let balanceSuccess = false;
                
                while (balanceRetryCount < maxBalanceRetries && !balanceSuccess) {
                    try {
                        // 添加随机延迟，避免请求过于频繁
                        const balanceRandomDelay = Math.floor(Math.random() * 300) + 100; // 100-400ms随机延迟
                        await new Promise(resolve => setTimeout(resolve, balanceRandomDelay));
                        
                        const accountInfo = tokenAccountsResponse.value[0];
                        const accountAddress = accountInfo.pubkey;
                        
                        // 使用更可靠的方式解析账户数据
                        const balanceResponse = await connection.getTokenAccountBalance(accountAddress);
                        
                        // 检查返回的数据结构是否完整
                        if (balanceResponse && balanceResponse.value && balanceResponse.value.uiAmount !== undefined) {
                            const balance = balanceResponse.value.uiAmount;
                            balanceInfoElement.innerText = `w3w代币余额: ${balance}`;
                            statusElement.innerText = '检测完成: 钱包中有w3w代币';
                            statusElement.style.color = 'green';
                            balanceSuccess = true;
                            console.log('成功获取w3w代币余额:', balance);
                        } else {
                            throw new Error('返回的余额数据结构不完整');
                        }
                    } catch (balanceErr) {
                        balanceRetryCount++;
                        console.warn(`获取代币余额失败，尝试 ${balanceRetryCount}/${maxBalanceRetries}:`, balanceErr);
                        
                        // 如果还有重试次数，等待后重试
                        if (balanceRetryCount < maxBalanceRetries) {
                            const waitTime = 1000 * balanceRetryCount;
                            console.log(`等待 ${waitTime}ms 后重试获取余额...`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                        } else {
                            // 所有重试都失败，显示错误信息
                            console.error('获取代币余额失败，已达到最大重试次数');
                            balanceInfoElement.innerText = '您的钱包中有w3w代币（无法获取具体余额）';
                            statusElement.innerText = '检测完成: 钱包中有w3w代币';
                            statusElement.style.color = 'green';
                        }
                    }
                }
            } else {
                // 用户没有w3w代币
                balanceInfoElement.innerText = '您的钱包中没有w3w代币';
                statusElement.innerText = '检测完成: 钱包中没有w3w代币';
                statusElement.style.color = 'orange';
            }
            
            // 成功使用备用方法，提前返回
            return;
            
        } catch (backupErr) {
            // 备用方法也失败，记录错误并继续尝试原始方法
            console.warn('备用检测方法失败，尝试原始方法:', backupErr);
        }
        
        // 如果备用方法失败，回退到原始方法 - 使用getParsedTokenAccountsByOwner
        let tokenAccounts = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                // 添加请求选项，包括重试和超时设置
                const opts = {
                    commitment: 'confirmed',
                    encoding: 'jsonParsed'
                };
                
                // 添加随机延迟，避免同时请求多个节点导致被限制
                const randomDelay = Math.floor(Math.random() * 500) + 100; // 100-600ms随机延迟
                await new Promise(resolve => setTimeout(resolve, randomDelay));
                
                tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                    publicKey,
                    { mint: w3wTokenMint },
                    opts
                );
                
                // 记录成功信息
                console.log('成功获取代币账户信息:', tokenAccounts?.value?.length || 0);
                break; // 成功获取数据，跳出循环
            } catch (err) {
                retryCount++;
                // 详细记录错误信息
                const errorCode = err.code || (err.message && err.message.includes('403') ? 403 : 'unknown');
                const errorMessage = err.message || '未知错误';
                
                console.warn(`获取代币账户失败，尝试 ${retryCount}/${maxRetries}:`, {
                    code: errorCode,
                    message: errorMessage,
                    endpoint: connection._rpcEndpoint
                });
                
                // 如果是403错误或其他访问限制错误，立即尝试下一个RPC节点
                if (errorCode === 403 || errorMessage.includes('403') || errorMessage.includes('forbidden') || errorMessage.includes('Access forbidden') || errorMessage.includes('Forbidden')) {
                    console.log('检测到访问限制错误，切换到下一个RPC节点');
                    // 尝试切换到下一个RPC节点，但使用随机选择而不是顺序选择
                    // 这样可以避免所有用户都按相同顺序请求节点导致某些节点过载
                    let availableEndpoints = rpcEndpoints.filter(ep => ep !== connection._rpcEndpoint);
                    if (availableEndpoints.length > 0) {
                        // 随机选择一个新的节点
                        const randomIndex = Math.floor(Math.random() * availableEndpoints.length);
                        const nextEndpoint = availableEndpoints[randomIndex];
                        console.log(`切换到新的RPC节点: ${nextEndpoint}`);
                        try {
                            connection = new solanaWeb3Lib.Connection(nextEndpoint, connectionConfig);
                            // 不计入重试次数
                            retryCount--;
                        } catch (connErr) {
                            console.error('切换RPC节点失败:', connErr);
                        }
                    }
                }
                
                if (retryCount >= maxRetries) {
                    throw new Error(`获取代币账户失败: ${errorMessage} (错误代码: ${errorCode})`);
                }
                
                // 等待时间随重试次数增加
                const waitTime = 1000 * retryCount;
                console.log(`等待 ${waitTime}ms 后重试...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        
        balanceInfoElement.style.display = 'block';
        
        if (tokenAccounts.value.length > 0) {
            // 用户拥有w3w代币
            const account = tokenAccounts.value[0];
            const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
            
            balanceInfoElement.innerText = `w3w代币余额: ${balance}`;
            statusElement.innerText = '检测完成: 钱包中有w3w代币';
            statusElement.style.color = 'green';
        } else {
            // 用户没有w3w代币
            balanceInfoElement.innerText = '您的钱包中没有w3w代币';
            statusElement.innerText = '检测完成: 钱包中没有w3w代币';
            statusElement.style.color = 'orange';
        }
    } catch (err) {
        console.error('检查代币失败:', err);
        balanceInfoElement.style.display = 'block';
        
        // 检查是否是特定错误类型
        const is403Error = err.message && (err.message.includes('403') || err.message.includes('forbidden') || err.message.includes('Access forbidden') || err.message.includes('Forbidden'));
        const isNetworkError = err.message && (err.message.includes('network') || err.message.includes('timeout') || err.message.includes('connection'));
        const isAccountNotFoundError = err.message && (err.message.includes('account not found') || err.message.includes('Account does not exist'));
        
        if (isAccountNotFoundError) {
            // 明确提示用户未持有代币，而非依赖错误处理
            balanceInfoElement.innerText = '您的钱包中没有w3w代币';
            statusElement.innerText = '检测完成: 钱包中没有w3w代币';
            statusElement.style.color = 'orange';
            return; // 提前返回，不显示重试按钮
        } else if (is403Error) {
            balanceInfoElement.innerHTML = '检查代币失败: RPC节点访问受限。<br>这可能是暂时性问题，请稍后再试。';
            statusElement.innerText = 'RPC节点访问受限';
        } else if (isNetworkError) {
            balanceInfoElement.innerHTML = '检查代币失败: 网络连接问题。<br>请检查您的网络连接并稍后再试。';
            statusElement.innerText = '网络连接问题';
        } else {
            balanceInfoElement.innerText = '检查代币失败: ' + err.message;
            statusElement.innerText = '检查代币失败';
        }
        
        // 添加重试按钮
        const retryButton = document.createElement('button');
        retryButton.innerText = '重试';
        retryButton.style.marginTop = '10px';
        retryButton.style.padding = '8px 16px';
        retryButton.style.backgroundColor = '#512da8';
        retryButton.style.color = 'white';
        retryButton.style.border = 'none';
        retryButton.style.borderRadius = '4px';
        retryButton.style.cursor = 'pointer';
        retryButton.onclick = () => checkW3WToken(publicKey);
        balanceInfoElement.appendChild(document.createElement('br'));
        balanceInfoElement.appendChild(retryButton);
        
        statusElement.style.color = 'red';
    }
}

// 页面加载完成后添加事件监听器
document.addEventListener('DOMContentLoaded', () => {
    const connectButton = document.getElementById('connect-wallet');
    connectButton.addEventListener('click', connectWallet);
    
    // 检查Phantom钱包是否已安装
    const statusElement = document.getElementById('status');
    if (!checkIfPhantomInstalled()) {
        statusElement.innerText = '请先安装Phantom钱包';
        statusElement.style.color = 'red';
    }
});