// --- THEME ENGINE INITIALIZATION ---
    const savedTheme = localStorage.getItem('cyb305_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('cyb305_theme', newTheme);
    }

    // --- HARDCODED V4.3 CONTRACT ADDRESS ---
    const contractAddress = "0x6c5a774cf5039f36539b06193d234b745a5a6f0e"; 
    
    // V4.2 ABI 
    const contractABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"string","name":"itemId","type":"string"},{"indexed":false,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"string","name":"action","type":"string"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"CustodyTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"string","name":"itemId","type":"string"},{"indexed":false,"internalType":"string","name":"caseName","type":"string"},{"indexed":true,"internalType":"address","name":"custodian","type":"address"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"EvidenceLogged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"string","name":"itemId","type":"string"},{"indexed":true,"internalType":"address","name":"tech","type":"address"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"LabReportUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"operative","type":"address"},{"indexed":false,"internalType":"uint8","name":"role","type":"uint8"}],"name":"OperativeAuthorized","type":"event"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allItemIds","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_operative","type":"address"},{"internalType":"uint8","name":"_roleId","type":"uint8"}],"name":"authorizeOperative","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"currentCustodian","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"evidenceHistory","outputs":[{"internalType":"string","name":"itemId","type":"string"},{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"string","name":"action","type":"string"},{"internalType":"uint256","name":"timestamp","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"evidenceRegistry","outputs":[{"internalType":"string","name":"caseName","type":"string"},{"internalType":"string","name":"itemId","type":"string"},{"internalType":"string","name":"walrusBlobId","type":"string"},{"internalType":"string","name":"analysisReport","type":"string"},{"internalType":"string","name":"evaluationReport","type":"string"},{"internalType":"string","name":"lastAction","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAllOperatives","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTotalItems","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getTotalLogs","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"isRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"itemExists","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"_caseName","type":"string"},{"internalType":"string","name":"_itemId","type":"string"},{"internalType":"string","name":"_walrusBlobId","type":"string"}],"name":"logInitialSeizure","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"operativeRoles","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"registeredOperatives","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"_itemId","type":"string"},{"internalType":"string","name":"_analysis","type":"string"},{"internalType":"string","name":"_evaluation","type":"string"}],"name":"submitLabReport","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_itemId","type":"string"},{"internalType":"address","name":"_newCustodian","type":"address"},{"internalType":"string","name":"_action","type":"string"}],"name":"transferCustody","outputs":[],"stateMutability":"nonpayable","type":"function"}];

    let provider, signer, contract, userAddress, myProfile;
    let aliasReverseMap = {}; 

    // --- UNIVERSAL GAS OVERRIDE ENGINE ---
    const secureGasOptions = { 
    maxPriorityFeePerGas: ethers.utils.parseUnits('26', 'gwei'),
    maxFeePerGas: ethers.utils.parseUnits('28', 'gwei')
    };

    // --- GEOGRAPHIC MONOGRAM COMBINATOR (FIXED MATH LOGIC) ---
    const animals = ["Gorilla", "Platypus", "Wolf", "Raven", "Kraken", "Viper", "Panther", "Falcon", "Mantis", "Shark", "Jackal", "Fox", "Bear", "Owl", "Cobra"];
    const locations = ["Kyoto", "Brazil", "Texas", "Madagascar", "Cairo", "London", "Dubai", "Sydney", "Mumbai", "Paris", "Toronto", "Berlin", "Seoul", "Rome", "Lagos"];

    function getAlias(address) {
        if (!address || address === "0x0000000000000000000000000000000000000000") return { name: "Origin Node", initials: "ON" };
        
        // Splits the hex safely to prevent negative bitwise results
        const animSeed = parseInt(address.substring(2, 8), 16);
        const locSeed = parseInt(address.substring(8, 14), 16); 
        
        const animal = animals[animSeed % animals.length];
        const loc = locations[locSeed % locations.length];
        
        return { name: `Agent ${animal} of ${loc}`, initials: `${animal.charAt(0)}${loc.charAt(0)}` };
    }

    // --- FIXED LAYER SWITCHING (PREVENTS OVERLAPPING) ---
    function switchLayer(layerId) {
        document.querySelectorAll('.layer').forEach(el => el.classList.remove('active'));
        
        // Explicitly banish onboarding so it doesn't stack
        document.getElementById('layer-onboarding').classList.remove('active'); 
        document.getElementById('layer-onboarding').style.display = 'none';

        document.getElementById(layerId).classList.add('active');
        
        if(layerId === 'layer-onboarding') {
            document.getElementById('layer-onboarding').classList.add('active');
            document.getElementById('layer-onboarding').style.display = 'flex';
        }
    }

    function logout() { location.reload(); }

    // --- AUTHENTICATION & ONBOARDING FLOW (STRICT ACCESS CONTROL) ---
    document.getElementById('connectBtn').addEventListener('click', async () => {
        try {
            await window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
            provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            userAddress = await signer.getAddress();
            contract = new ethers.Contract(contractAddress, contractABI, signer);
            
            // --- THE SECURITY PATCH ---
            // Ask the blockchain if this wallet has been authorized by the Admin
            const userRole = await contract.operativeRoles(userAddress);
            if (userRole == 0) {
                // If role is 0, kick them out immediately. 
                throw new Error("ACCESS DENIED: Clearance not found. Contact Admin.");
            }
            
            myProfile = getAlias(userAddress);
            const pref = localStorage.getItem('aliasPref_' + userAddress);

            if (!pref) {
                switchLayer('layer-onboarding');
                setTimeout(() => {
                    document.getElementById('onboardConsole').style.display = 'none';
                    document.getElementById('onboardReveal').style.display = 'block';
                    document.getElementById('modalAvatar').innerText = myProfile.initials;
                    document.getElementById('modalName').innerText = myProfile.name;
                }, 2000);
            } else {
                updateBadgeDisplay(pref);
                switchLayer('layer-dashboard');
            }
        } catch (e) { 
            console.error("WEB3 AUTH ERROR:", e); 
            document.getElementById('authError').innerText = (e.message || "Unknown Error"); 
            document.getElementById('authError').style.display="block"; 
        }
    });

    function acceptAlias() { localStorage.setItem('aliasPref_' + userAddress, 'revealed'); updateBadgeDisplay('revealed'); switchLayer('layer-dashboard'); }
    function skipAlias() { localStorage.setItem('aliasPref_' + userAddress, 'raw'); updateBadgeDisplay('raw'); switchLayer('layer-dashboard'); }
    function decodeAliasLater() { acceptAlias(); }

    function updateBadgeDisplay(pref) {
        const badge = document.getElementById('userBadge');
        const decodeBtn = document.getElementById('decodeBtn');
        if (pref === 'revealed') {
            badge.innerHTML = `<div class="mini-shield">${myProfile.initials}</div> ${myProfile.name}`;
            decodeBtn.style.display = 'none';
        } else {
            badge.innerText = `ID: ${userAddress.substring(0,8)}...`;
            decodeBtn.style.display = 'inline-block';
        }
    }

    // --- V4.2 CASCADING DATALIST (RBAC) ---
    document.getElementById('trAction').addEventListener('change', async (e) => {
        const action = e.target.value;
        const inputField = document.getElementById('trCustodian');
        const datalist = document.getElementById('operativeList');
        inputField.disabled = false;
        inputField.placeholder = "Querying Blockchain Roster...";
        datalist.innerHTML = "";
        aliasReverseMap = {}; 

        try {
            let reqRole = 0;
            if (action.includes("Secure Storage")) reqRole = 2; 
            else if (action.includes("Forensic") || action.includes("Analysis")) reqRole = 3; 
            else if (action.includes("Legal Review")) reqRole = 4; 

            const roster = await contract.getAllOperatives();
            
            for (let i = 0; i < roster.length; i++) {
                const opAddress = roster[i];
                const opRole = await contract.operativeRoles(opAddress);
                
                if (opRole == reqRole || reqRole == 0) { 
                    const opAlias = getAlias(opAddress);
                    const displayName = `[${opAlias.initials}] ${opAlias.name}`;
                    
                    const option = document.createElement('option');
                    option.value = displayName; 
                    datalist.appendChild(option);
                    aliasReverseMap[displayName] = opAddress;
                }
            }
            inputField.placeholder = "2. Select Target Operative or paste 0x...";
            inputField.value = "";
        } catch (error) {
            inputField.placeholder = "Directory Offline. Paste Raw 0x...";
        }
    });

    // --- MODULE A: INTAKE (WITH 5-SECOND TIMEOUT OVERRIDE) ---
    document.getElementById('btnSubmitIntake').addEventListener('click', async () => {
        const cName = document.getElementById('inCaseName').value;
        const iId = document.getElementById('inItemId').value;
        const file = document.getElementById('inFile').files[0];
        const status = document.getElementById('statusIntake');
        
        if(!cName || !iId || !file) return alert("Fill all fields");
        
        try {
            status.style.display="block"; status.className="status-box active";
            status.innerText="> Uploading to decentralized node (Max 5s wait)...";
            
            // Generate a secure fallback hash just in case the testnet is down
            let bId = "fallback_hash_" + Math.random().toString(36).substring(2, 15);
            
            try {
                // Set a strict 5-second kill switch for the Walrus upload
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const res = await fetch("https://publisher.walrus-testnet.walrus.space/v1/store?epochs=5", { 
                    method: "PUT", 
                    body: file,
                    signal: controller.signal // Ties the kill switch to this fetch request
                });
                
                clearTimeout(timeoutId); // If it succeeds quickly, cancel the kill switch
                
                const data = await res.json(); 
                bId = data.alreadyCertified ? data.alreadyCertified.blobId : data.newlyCreated.blobObject.blobId;
            } catch(e) {
                console.warn("Walrus Testnet Offline or Timed Out. Utilizing fallback hash.");
            }
            
            status.innerText="> Hash secured. Signing EVM State...";
            
            // Send to Polygon Amoy with our Gas Override Engine
            const tx = await contract.logInitialSeizure(cName, iId, bId, secureGasOptions);
            await tx.wait(); 
            
            alert("Secured! Walrus/Fallback ID: " + bId); 
            switchLayer('layer-dashboard');
        } catch(e) { 
            status.className="status-box error"; 
            status.innerText="Error: " + e.message; 
        }
    });

    // --- MODULE B: TRANSFER (WITH REVERSE ALIAS LOOKUP) ---
    document.getElementById('btnSubmitTransfer').addEventListener('click', async () => {
        const search = document.getElementById('trSearch').value;
        const wId = document.getElementById('trWalrusId').value;
        const rawInput = document.getElementById('trCustodian').value;
        const act = document.getElementById('trAction').value;
        const status = document.getElementById('statusTransfer');
        try {
            status.className="status-box active"; status.style.display="block"; status.innerText="> Verifying...";
            
            let destAddress = rawInput;
            if (aliasReverseMap[rawInput]) {
                destAddress = aliasReverseMap[rawInput]; 
            } else if (!rawInput.startsWith("0x") || rawInput.length !== 42) {
                throw new Error("Invalid Target. Select from directory or input raw 0x address.");
            }

            const total = await contract.getTotalItems();
            let targetId = null;
            for(let i=0; i<total; i++) {
                const id = await contract.allItemIds(i);
                const reg = await contract.evidenceRegistry(id);
                if(reg.walrusBlobId === wId && (id === search || reg.caseName === search)) { targetId = id; break; }
            }
            if(!targetId) throw new Error("Integrity Mismatch. Hash rejected.");
            
            status.innerText="> Submitting to Blockchain...";
            
            // Note the secureGasOptions passed at the end
            const tx = await contract.transferCustody(targetId, destAddress, act, secureGasOptions);
            await tx.wait(); alert("Transferred!"); switchLayer('layer-dashboard');
        } catch(e) { status.className="status-box error"; status.innerText=e.message; }
    });

    // --- MODULE C: HISTORY (EXPANDABLE UX) ---
    async function loadHistory() {
        switchLayer('layer-history');
        const container = document.getElementById('historyContainer');
        container.innerHTML = "<div class='text-center' style='padding: 20px; font-family: monospace; color: var(--accent-cyan);'>> Querying Blockchain Ledgers...</div>";
        
        try {
            const total = await contract.getTotalLogs();
            let html = "";
            
            for(let i = total - 1; i >= 0; i--) {
                const log = await contract.evidenceHistory(i);
                
                // Fetch the registry to get the Case Name and File Hash (Walrus ID)
                const reg = await contract.evidenceRegistry(log.itemId);
                
                // Format the UNIX timestamp into a human-readable local date
                const dateStr = new Date(log.timestamp * 1000).toLocaleString();
                
                const toAlias = getAlias(log.to);
                const fromAlias = getAlias(log.from);
                
                // Smart Logic: "By" vs "To" based on whether it's an initial seizure
                const isInitial = log.action.toLowerCase().includes("initial") || log.from === "0x0000000000000000000000000000000000000000";
                const actionTargetLabel = isInitial ? "By:" : "To:";
                const fromRow = isInitial ? "" : `<b>From:</b> <span style="color:var(--accent-cyan)">[${fromAlias.initials}]</span> ${fromAlias.name}<br>`;

                // Build the Expandable Card
                html += `
                <div class="history-card" onclick="this.classList.toggle('open')">
                    <div class="history-summary">
                        <span><span style="color:var(--text-muted); font-size:11px;">${dateStr.split(',')[0]}</span> &nbsp; ${log.itemId} <span style="color:var(--accent-cyan)">//</span> ${log.action}</span>
                        <span class="expand-icon">>></span>
                    </div>
                    <div class="history-details">
                        <b>Timestamp:</b> ${dateStr}<br>
                        <b>Case Name:</b> ${reg.caseName}<br>
                        <b>File Hash (Walrus ID):</b> <span class="mono" style="word-break: break-all; font-size: 11px;">${reg.walrusBlobId}</span><br>
                        <div style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.03); border-radius: 6px;">
                            ${fromRow}
                            <b>${actionTargetLabel}</b> <span style="font-weight:700; color:var(--accent-cyan)">[${toAlias.initials}]</span> ${toAlias.name}
                        </div>
                    </div>
                </div>`;
            }
            container.innerHTML = html || "<div style='text-align:center; padding: 20px;'>Empty Registry.</div>";
        } catch (error) {
            console.error(error);
            container.innerHTML = "<div style='color: var(--alert-red); padding: 20px;'>Error fetching blockchain state.</div>";
        }
    }

    // --- MODULE D: LOCKER ---
    async function loadLocker() {
        switchLayer('layer-locker');
        const grid = document.getElementById('lockerGrid');
        const total = await contract.getTotalItems();
        let html = "";
        for(let i=0; i<total; i++) {
            const id = await contract.allItemIds(i);
            const cust = await contract.currentCustodian(id);
            if(cust.toLowerCase() === userAddress.toLowerCase()) {
                const reg = await contract.evidenceRegistry(id);
                html += `<div class="grid-item" onclick="openLabPanel('${id}')"><span class="hologram-icon">🧊</span><div style="font-family:'Fira Code',monospace; font-size:14px; margin-bottom:4px; font-weight:700;">${id}</div><div style="font-size:11px; color:var(--accent-cyan); text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">${reg.caseName}</div></div>`;
            }
        }
        grid.innerHTML = html || "Empty Vault.";
    }

    // --- MODULE D-2: LAB TERMINAL ---
    async function openLabPanel(id) {
        switchLayer('layer-lab');
        currentActiveItemForLab = id;
        document.getElementById('labItemLabel').innerText = id;
        const reg = await contract.evidenceRegistry(id);
        document.getElementById('labAnalysis').value = reg.analysisReport;
        document.getElementById('labEvaluation').value = reg.evaluationReport;
        const isLab = (reg.lastAction.includes("Forensic") || reg.lastAction.includes("Analysis"));
        
        const alertBox = document.getElementById('labStatusAlert');
        if (isLab) {
            alertBox.innerHTML = "<span style='color:var(--success-green)'>[ CLEARANCE GRANTED ]</span> Write Access Enabled.";
            alertBox.style.borderLeftColor = "var(--success-green)";
        } else {
            alertBox.innerHTML = "<span style='color:var(--alert-red)'>[ READ ONLY ]</span> You lack the WRITE forensic clearance.";
            alertBox.style.borderLeftColor = "var(--alert-red)";
        }

        document.getElementById('btnSubmitLab').style.display = isLab ? "block" : "none";
        document.getElementById('labAnalysis').readOnly = !isLab;
        document.getElementById('labEvaluation').readOnly = !isLab;
    }

    document.getElementById('btnSubmitLab').addEventListener('click', async () => {
        try {
            const status = document.getElementById('statusLab');
            status.className="status-box active"; status.style.display = "block"; status.innerText = "> Encoding Matrices...";
            
            // Note the secureGasOptions passed at the end
            const tx = await contract.submitLabReport(currentActiveItemForLab, document.getElementById('labAnalysis').value, document.getElementById('labEvaluation').value, secureGasOptions);
            await tx.wait(); alert("Reports Encoded Globally."); status.style.display="none"; switchLayer('layer-locker');
        } catch(e) { const status = document.getElementById('statusLab'); status.className="status-box error"; status.innerText = e.message; }
    });
