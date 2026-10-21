// --- CONFIGURATION & ABI ---
const CONTRACT_ADDRESS = "0xf8879c91342a9d4330974cb678f36db00ace1b92";
const DEPLOYMENT_BLOCK = 50609920;
const POLYGON_AMOY_CHAIN_ID = "0x13882"; 

const ABI = [
    "function isAdmin(address) view returns (bool)",
    "function operativeRoles(address) view returns (uint8)",
    "function operativeUsernames(address) view returns (string)",
    "function operativeBadges(address) view returns (uint256)",
    "function registerUsername(string)",
    "function addAdmin(address)",
    "function authorizeNewOperative(address, uint8)",
    "function logInitialSeizure(string, string, string)",
    "function transferCustody(string, address, string)",
    "function currentCustodian(string) view returns (address)",
    "event UsernameRegistered(address indexed operative, string username)",
    "event EvidenceLogged(string indexed itemId, string caseName, address indexed custodian, uint256 timestamp)",
    "event CustodyTransferred(string indexed itemId, address from, address indexed to, string action, uint256 timestamp)"
];

// --- STATE VARIABLES ---
let provider, signer, contract;
let userAddress = "";
let userRole = 0;
let isUserAdmin = false;
let operativeDirectory = new Map(); // Maps username -> address
let reverseDirectory = new Map(); // Maps address -> username

// Session Security
let sessionTimeout;
let autoLockMinutes = 0;

// ==========================================================================
// 1. INITIALIZATION & STRICT AUTHENTICATION GATE
// ==========================================================================

async function initWeb3() {
    if (!window.ethereum) {
        showAuthError("CRITICAL: Web3 Provider (MetaMask) not detected.");
        return;
    }

    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        
        // Enforce Polygon Amoy Testnet
        const network = await provider.getNetwork();
        if (`0x${network.chainId.toString(16)}` !== POLYGON_AMOY_CHAIN_ID) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: POLYGON_AMOY_CHAIN_ID }],
                });
            } catch (switchError) {
                showAuthError("Please manually switch MetaMask to the Polygon Amoy network.");
                return;
            }
        }

        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
        await authenticateIdentity();

    } catch (err) {
        showAuthError("Handshake Terminated: " + err.message);
    }
}

async function authenticateIdentity() {
    try {
        document.getElementById("connectBtn").innerText = "Verifying Cryptographic Signature...";
        
        // Fetch RBAC & Identity from Contract
        isUserAdmin = await contract.isAdmin(userAddress);
        userRole = await contract.operativeRoles(userAddress);
        const username = await contract.operativeUsernames(userAddress);
        const badge = await contract.operativeBadges(userAddress);

        if (userRole === 0 && !isUserAdmin) {
            showAuthError("ACCESS DENIED: Origin Node lacks operative clearance.");
            return;
        }

        // Build Local Directory in the background so it doesn't block login
        syncDirectory();

        // Update UI Dashboard Metrics
        document.getElementById("navUsername").innerText = username || "UNREGISTERED";
        document.getElementById("navRole").innerText = isUserAdmin ? "System Admin" : `Role ID: ${userRole}`;
        document.getElementById("badgeInitials").innerText = username ? username.substring(0, 2).toUpperCase() : "XX";
        
        document.getElementById("profileUsername").innerText = username || "UNREGISTERED";
        document.getElementById("profileRole").innerText = `Level ${userRole} ${isUserAdmin ? "(Admin)" : ""}`;
        document.getElementById("profileBadge").innerText = badge > 0 ? badge : "N/A";
        document.getElementById("profileAddress").innerText = userAddress;

        // Show Admin Command & Control if authorized
        if (isUserAdmin) {
            document.getElementById("adminControlsGroup").style.display = "block";
        }

        // Pass the Gate: Hide Auth, Show Dashboard & Settings Gear
        document.getElementById("auth-container").style.display = "none";
        document.getElementById("dashboard-wrapper").style.display = "flex";
        document.getElementById("settingsGear").style.display = "flex";

        // Route based on Registration Status
        if (userRole > 0 && !username) {
            document.getElementById("registrationOverlay").style.display = "flex";
        } else {
            switchLayer('dashboard');
        }

        initSessionSecurity();

    } catch (err) {
        showAuthError("Authentication Failed: Network synchronization error.");
        console.error(err);
    }
}

function showAuthError(msg) {
    const errBox = document.getElementById("authError");
    errBox.innerText = msg;
    errBox.style.display = "block";
    document.getElementById("connectBtn").innerText = "Authenticate Identity";
}

function logout() {
    userAddress = "";
    userRole = 0;
    isUserAdmin = false;
    clearTimeout(sessionTimeout);
    
    // Hide Dashboard, Restore Auth Gate
    document.getElementById("dashboard-wrapper").style.display = "none";
    document.getElementById("settingsGear").style.display = "none";
    document.getElementById("auth-container").style.display = "block";
    
    location.reload(); // Hard wipe memory state
}

// ==========================================================================
// 2. EVENT-DRIVEN DIRECTORY 
// ==========================================================================

async function syncDirectory() {
    // Clear out old data before rebuilding
    operativeDirectory.clear();
    reverseDirectory.clear();
    
    const filter = contract.filters.UsernameRegistered();
    
    try {
        const latestBlock = await provider.getBlockNumber();
        const CHUNK_SIZE = 5000; // Safe limit to prevent RPC throttling
        let fromBlock = DEPLOYMENT_BLOCK; // Make sure this is set at the top of your file!

        // Silently loop through the blockchain in 5,000-block chunks
        while (fromBlock <= latestBlock) {
            let toBlock = fromBlock + CHUNK_SIZE;
            if (toBlock > latestBlock) toBlock = latestBlock;

            const events = await contract.queryFilter(filter, fromBlock, toBlock);
            
            events.forEach(event => {
                const address = event.args.operative;
                const name = event.args.username;
                operativeDirectory.set(name.toLowerCase(), address);
                reverseDirectory.set(address.toLowerCase(), name);
            });

            fromBlock = toBlock + 1;
        }
        
        // Let you know via the developer console that the background sync finished
        console.log(`[SYSTEM] Background directory sync complete. Loaded ${operativeDirectory.size} operatives.`);
        
    } catch (err) {
        console.warn("[WARNING] Background sync interrupted by RPC node. Ghost autocomplete may be incomplete.", err);
    }
}

// ==========================================================================
// 3. IDENTITY REGISTRATION GATE
// ==========================================================================

async function registerIdentity() {
    const input = document.getElementById("regUsername").value.trim();
    if (input.length < 4 || input.length > 15) {
        uiStatus("regStatus", "Error: Moniker must be 4-15 characters.", true);
        return;
    }

    try {
        uiStatus("regStatus", "Transmitting to EVM... Await Confirmation.", false);
        const tx = await contract.registerUsername(input, getGasOverrides());
        await tx.wait();
        uiStatus("regStatus", "Identity Secured. Initializing Mainframe...", false);
        
        setTimeout(() => {
            document.getElementById("registrationOverlay").style.display = "none";
            authenticateIdentity(); // Resync UI
        }, 2000);
    } catch (err) {
        uiStatus("regStatus", extractRevertReason(err), true);
    }
}

// ==========================================================================
// 4. MODULE A & B: INTAKE AND TRANSFER
// ==========================================================================

async function logEvidence() {
    const caseName = document.getElementById("caseName").value;
    const itemId = document.getElementById("itemId").value;
    const blobId = document.getElementById("blobId").value;

    if (!caseName || !itemId || !blobId) return uiStatus("statusIntake", "Missing parameters.", true);

    try {
        uiStatus("statusIntake", "Encoding Seizure Data...", false);
        const tx = await contract.logInitialSeizure(caseName, itemId, blobId, getGasOverrides());
        await tx.wait();
        uiStatus("statusIntake", "Evidence Mathematically Secured.", false);
    } catch (err) {
        uiStatus("statusIntake", extractRevertReason(err), true);
    }
}

async function transferCustody() {
    const itemId = document.getElementById("transferItemId").value;
    const action = document.getElementById("transferAction").value;
    let target = document.getElementById("transferAddress").value.trim();

    if (!itemId || !action || !target) return uiStatus("statusTransfer", "Missing parameters.", true);

    // Resolve Username to 0x Address using local directory
    if (!ethers.utils.isAddress(target)) {
        const resolvedAddress = operativeDirectory.get(target.toLowerCase());
        if (!resolvedAddress) {
            return uiStatus("statusTransfer", "Error: Target Alias not found in system.", true);
        }
        target = resolvedAddress;
    }

    try {
        uiStatus("statusTransfer", "Executing Transfer Protocol...", false);
        const tx = await contract.transferCustody(itemId, target, action, getGasOverrides());
        await tx.wait();
        uiStatus("statusTransfer", "Transfer Executed & Logged.", false);
        document.getElementById("transferAddress").value = "";
        document.getElementById("ghostInput").value = "";
    } catch (err) {
        uiStatus("statusTransfer", extractRevertReason(err), true);
    }
}

// ==========================================================================
// 5. GHOST AUTOCOMPLETE LOGIC
// ==========================================================================
const transferInput = document.getElementById("transferAddress");
const ghostInput = document.getElementById("ghostInput");
const dropdown = document.getElementById("transferDropdown");

transferInput.addEventListener("input", (e) => {
    const val = e.target.value;
    const lowerVal = val.toLowerCase();
    
    dropdown.style.display = "none";
    dropdown.innerHTML = "";
    ghostInput.value = "";

    if (!val) return;

    // Check for raw Hex Paste overriding
    if (val.length === 42 && val.startsWith("0x")) {
        const matchedName = reverseDirectory.get(lowerVal);
        if (matchedName) {
            transferInput.style.color = "var(--accent-cyan)";
            setTimeout(() => { 
                transferInput.value = matchedName; 
                transferInput.style.color = "var(--text-main)";
            }, 300);
        }
        return;
    }

    // Match typing against usernames
    const matches = Array.from(operativeDirectory.keys()).filter(name => name.startsWith(lowerVal));
    
    if (matches.length === 1) {
        const addr = operativeDirectory.get(matches[0]);
        const displayName = reverseDirectory.get(addr.toLowerCase());
        ghostInput.value = val + displayName.substring(val.length);
    } else if (matches.length > 1) {
        matches.forEach(match => {
            const addr = operativeDirectory.get(match);
            const displayName = reverseDirectory.get(addr.toLowerCase());
            
            const div = document.createElement("div");
            div.className = "dropdown-item";
            div.innerText = displayName;
            div.onclick = () => {
                transferInput.value = displayName;
                dropdown.style.display = "none";
                ghostInput.value = "";
            };
            dropdown.appendChild(div);
        });
        dropdown.style.display = "block";
    }
});

transferInput.addEventListener("keydown", (e) => {
    if ((e.key === "Tab" || e.key === "ArrowRight" || e.key === "Enter") && ghostInput.value) {
        e.preventDefault();
        transferInput.value = ghostInput.value;
        ghostInput.value = "";
    }
});

// ==========================================================================
// 6. ADMIN C&C & SYSTEM SETTINGS
// ==========================================================================

function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab, .admin-tab-content').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
}

async function executeAdminAuth() {
    const target = document.getElementById("authAddress").value;
    const role = document.getElementById("authRole").value;
    
    if (!target || !role) return uiStatus("statusAdminAuth", "Missing inputs.", true);
    
    try {
        uiStatus("statusAdminAuth", "Authorizing Cryptographic Clearance...", false);
        const tx = await contract.authorizeNewOperative(target, role, getGasOverrides());
        await tx.wait();
        uiStatus("statusAdminAuth", "Operative Authorized. Badge Generated.", false);
    } catch (err) {
        uiStatus("statusAdminAuth", extractRevertReason(err), true);
    }
}

async function executeAddAdmin() {
    const target = document.getElementById("newAdminAddress").value;
    if (!target) return uiStatus("statusAdminAuth", "Missing target node address.", true);
    
    try {
        uiStatus("statusAdminAuth", "Elevating Privileges...", false);
        const tx = await contract.addAdmin(target, getGasOverrides());
        await tx.wait();
        uiStatus("statusAdminAuth", "Admin Privileges Elevated.", false);
    } catch (err) {
        uiStatus("statusAdminAuth", extractRevertReason(err), true);
    }
}

function getGasOverrides() {
    const priority = document.getElementById("gasPriority").value || 30;
    const max = document.getElementById("gasMax").value || 40;
    return {
        maxPriorityFeePerGas: ethers.utils.parseUnits(priority.toString(), "gwei"),
        maxFeePerGas: ethers.utils.parseUnits(max.toString(), "gwei")
    };
}

// Session Security
document.getElementById("autoLockTimer").addEventListener("change", (e) => {
    autoLockMinutes = parseInt(e.target.value);
    resetSessionTimer();
});

function resetSessionTimer() {
    clearTimeout(sessionTimeout);
    if (autoLockMinutes > 0 && userAddress) {
        sessionTimeout = setTimeout(() => {
            alert("Session Auto-Terminated due to terminal inactivity.");
            logout();
        }, autoLockMinutes * 60 * 1000);
    }
}
document.onmousemove = resetSessionTimer;
document.onkeypress = resetSessionTimer;
function initSessionSecurity() { resetSessionTimer(); }

// ==========================================================================
// 7. UI ROUTING & OPTICS
// ==========================================================================

function switchLayer(layerId) {
    document.querySelectorAll('.layer').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    const targetLayer = document.getElementById(`layer-${layerId}`);
    targetLayer.style.display = 'block';
    setTimeout(() => targetLayer.classList.add('active'), 10);
}

function toggleTheme() {
    document.body.classList.toggle("theme-dark");
}

function uiStatus(elementId, msg, isError) {
    const box = document.getElementById(elementId);
    box.innerText = msg;
    box.style.display = "block";
    box.style.color = isError ? "var(--alert-red)" : "var(--accent-cyan)";
    box.style.borderLeftColor = isError ? "var(--alert-red)" : "var(--accent-cyan)";
    box.style.backgroundColor = isError ? "rgba(220, 38, 38, 0.1)" : "rgba(0, 240, 255, 0.1)";
    if(!isError) box.classList.add("active");
    else box.classList.remove("active");
    
    if(!isError && !msg.includes("Await") && !msg.includes("Transmitting") && !msg.includes("Executing")) {
        setTimeout(() => { box.style.display = "none"; }, 5000);
    }
}

function extractRevertReason(err) {
    if (err.data && err.data.message) return err.data.message;
    if (err.message) return err.message.split(' (')[0]; 
    return "Transaction Failed. Check permissions.";
}
