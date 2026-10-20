// --- CONFIGURATION & ABI ---
const CONTRACT_ADDRESS = "0xF8879C91342a9d4330974Cb678F36Db00Ace1b92";
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
// 1. INITIALIZATION & AUTHENTICATION
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

        // Build Local Directory from Events (Solves the Array Bricking Vulnerability)
        await syncDirectory();

        // Update UI Dashboard
        document.getElementById("navUsername").innerText = username || "UNREGISTERED";
        document.getElementById("navRole").innerText = isUserAdmin ? "System Admin" : `Role ID: ${userRole}`;
        document.getElementById("badgeInitials").innerText = username ? username.substring(0, 2).toUpperCase() : "XX";
        
        // Populate Dossier
        document.getElementById("profileUsername").innerText = username || "UNREGISTERED";
        document.getElementById("profileRole").innerText = `Level ${userRole} ${isUserAdmin ? "(Admin)" : ""}`;
        document.getElementById("profileBadge").innerText = badge > 0 ? badge : "N/A";
        document.getElementById("profileAddress").innerText = userAddress;

        // Show Admin C&C if authorized
        if (isUserAdmin) {
            document.getElementById("adminControlsGroup").style.display = "block";
        }

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
    switchLayer('auth');
    location.reload(); // Hard wipe memory state
}

// ==========================================================================
// 2. EVENT-DRIVEN DIRECTORY (Replaces Unbounded Arrays)
// ==========================================================================

async function syncDirectory() {
    operativeDirectory.clear();
    reverseDirectory.clear();
    
    // Fetch all UsernameRegistered events from block 0 to latest
    const filter = contract.filters.UsernameRegistered();
    const events = await contract.queryFilter(filter);
    
    events.forEach(event => {
        const address = event.args.operative;
        const name = event.args.username;
        operativeDirectory.set(name.toLowerCase(), address);
        reverseDirectory.set(address.toLowerCase(), name);
    });
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

    // 1. Check for raw Hex Paste overriding
    if (val.length === 42 && val.startsWith("0x")) {
        const matchedName = reverseDirectory.get(lowerVal);
        if (matchedName) {
            // Flash cyan to confirm match, then resolve text
            transferInput.style.color = "var(--accent-cyan)";
            setTimeout(() => { 
                transferInput.value = matchedName; 
                transferInput.style.color = "var(--text-main)";
            }, 300);
        }
        return;
    }

    // 2. Match typing against usernames
    const matches = Array.from(operativeDirectory.keys()).filter(name => name.startsWith(lowerVal));
    
    if (matches.length === 1) {
        // Happy Path: Ghost Prediction
        const originalCase = Array.from(operativeDirectory.keys()).find(k => k === matches[0]); // (Simplified logic assuming lowercase map)
        
        // Find the actual display name from reverse directory to preserve capitalization
        const addr = operativeDirectory.get(matches[0]);
        const displayName = reverseDirectory.get(addr.toLowerCase());

        ghostInput.value = val + displayName.substring(val.length);
    } else if (matches.length > 1) {
        // Collision Resolver: Smart Dropdown
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

function getGasOverrides() {
    const priority = document.getElementById("gasPriority").value || 30;
    const max = document.getElementById("gasMax").value || 40;
    return {
        maxPriorityFeePerGas: ethers.utils.parseUnits(priority.toString(), "gwei"),
        maxFeePerGas: ethers.utils.parseUnits(max.toString(), "gwei")
    };
}

// Session Security: Track Mouse Movement
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
    
    // Deactivate all sidebar buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    const targetLayer = document.getElementById(`layer-${layerId}`);
    targetLayer.style.display = 'block';
    // Small timeout to allow CSS block rendering before adding active class for animation
    setTimeout(() => targetLayer.classList.add('active'), 10);
}

function toggleTheme() {
    const body = document.body;
    body.classList.toggle("theme-dark");
    
    const isDark = body.classList.contains("theme-dark");
    document.getElementById("opticsToggle").checked = isDark;
    
    // Update SVG Path for Sun/Moon
    const iconPath = document.querySelector("#themeIcon path");
    if(isDark) {
        iconPath.setAttribute("d", "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"); // Moon
    } else {
        iconPath.setAttribute("d", "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"); // Sun
    }
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
    
    if(!isError && !msg.includes("Await")) {
        setTimeout(() => { box.style.display = "none"; }, 5000);
    }
}

function extractRevertReason(err) {
    if (err.data && err.data.message) return err.data.message;
    if (err.message) return err.message.split(' (')[0]; 
    return "Transaction Failed. Check permissions.";
}
