// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ChainOfCustodyV4_2 {
    
    address public admin;

    // --- V4.2 RBAC: ROLE DEFINITIONS ---
    // 0 = Unassigned / Revoked
    // 1 = First Responding Investigator
    // 2 = Evidence Clerk
    // 3 = Forensic Lab Tech
    // 4 = Court Liaison
    mapping(address => uint8) public operativeRoles;
    
    // The "Live Roster" for the Frontend Alias Generator
    address[] public registeredOperatives;
    mapping(address => bool) public isRegistered;

    // --- EVENTS ---
    event OperativeAuthorized(address indexed operative, uint8 role);
    event EvidenceLogged(string indexed itemId, string caseName, address indexed custodian, uint256 timestamp);
    event CustodyTransferred(string indexed itemId, address indexed from, address indexed to, string action, uint256 timestamp);
    event LabReportUpdated(string indexed itemId, address indexed tech, uint256 timestamp);

    constructor() {
        admin = msg.sender;
        // Make the Admin a Lead Investigator by default so they can log initial evidence
        _addOperative(msg.sender, 1); 
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "ACCESS DENIED: Admin clearance required.");
        _;
    }

    modifier onlyAuthorized() {
        require(operativeRoles[msg.sender] > 0, "ACCESS DENIED: Wallet not recognized in operative registry.");
        _;
    }

    // Limits standard identifiers (IDs, Hashes) to 150 bytes
    modifier validString(string memory _str) {
        require(bytes(_str).length > 0, "ERROR: Input cannot be empty.");
        require(bytes(_str).length <= 150, "ERROR: Input exceeds limits.");
        _;
    }

    // --- THE DOS PATCH: Limits heavy text inputs to 2500 bytes ---
    modifier validReport(string memory _str) {
        require(bytes(_str).length > 0, "ERROR: Report cannot be empty.");
        require(bytes(_str).length <= 2500, "ERROR: Report exceeds 2500 byte limit. Keep logs concise.");
        _;
    }

    // --- V4.2: THE LIVE ROSTER ENGINE ---
    function authorizeOperative(address _operative, uint8 _roleId) public onlyAdmin {
        require(_operative != address(0), "SECURITY BLOCK: Cannot authorize the zero address.");
        require(_roleId >= 1 && _roleId <= 4, "ERROR: Invalid Role ID.");
        
        _addOperative(_operative, _roleId);
        emit OperativeAuthorized(_operative, _roleId);
    }

    function _addOperative(address _operative, uint8 _roleId) private {
        operativeRoles[_operative] = _roleId;
        if (!isRegistered[_operative]) {
            registeredOperatives.push(_operative);
            isRegistered[_operative] = true;
        }
    }

    // Frontend helper to easily fetch the whole roster for the Alias Dropdowns
    function getAllOperatives() public view returns (address[] memory) {
        return registeredOperatives;
    }

    // --- DATA STRUCTURES ---
    struct Evidence {
        string caseName;
        string itemId;
        string walrusBlobId;
        string analysisReport;
        string evaluationReport;
        string lastAction; 
    }

    mapping(string => Evidence) public evidenceRegistry; 
    mapping(string => address) public currentCustodian;
    mapping(string => bool) public itemExists;
    string[] public allItemIds;

    struct EvidenceLog {
        string itemId;
        address from;
        address to;
        string action;
        uint256 timestamp;
    }
    EvidenceLog[] public evidenceHistory;

    // --- MODULE A: INTAKE ---
    function logInitialSeizure(string memory _caseName, string memory _itemId, string memory _walrusBlobId) 
        public 
        onlyAuthorized 
        validString(_caseName) 
        validString(_itemId) 
        validString(_walrusBlobId) 
    {
        require(!itemExists[_itemId], "Item ID already exists.");
        
        itemExists[_itemId] = true;
        currentCustodian[_itemId] = msg.sender;
        allItemIds.push(_itemId);
        
        evidenceRegistry[_itemId] = Evidence(_caseName, _itemId, _walrusBlobId, "Pending Lab Analysis...", "Pending Evaluation...", "Initial Seizure");
        evidenceHistory.push(EvidenceLog(_itemId, address(0), msg.sender, "Initial Seizure", block.timestamp));
        
        emit EvidenceLogged(_itemId, _caseName, msg.sender, block.timestamp);
    }

    // --- MODULE B: TRANSFER (WITH STRICT RBAC) ---
    function transferCustody(string memory _itemId, address _newCustodian, string memory _action) 
        public 
        onlyAuthorized 
        validString(_itemId)
        validString(_action)
    {
        require(itemExists[_itemId], "Item does not exist.");
        require(currentCustodian[_itemId] == msg.sender, "You do not hold this evidence.");
        require(_newCustodian != address(0), "SECURITY BLOCK: Cannot transfer evidence to the zero address.");
        require(operativeRoles[_newCustodian] > 0, "Receiver is not an authorized operative.");

        // --- V4.2 ROLE ENFORCEMENT PROTOCOL ---
        bytes32 actionHash = keccak256(abi.encodePacked(_action));
        uint8 targetRole = operativeRoles[_newCustodian];

        if (actionHash == keccak256(abi.encodePacked("Transferred to Secure Storage"))) {
            require(targetRole == 2, "SECURITY BLOCK: Receiver must be an Evidence Clerk (Role 2).");
        } 
        else if (actionHash == keccak256(abi.encodePacked("Checked out for Forensic Imaging")) || actionHash == keccak256(abi.encodePacked("Checked out for Data Analysis"))) {
            require(targetRole == 3, "SECURITY BLOCK: Receiver must be a Forensic Lab Tech (Role 3).");
        } 
        else if (actionHash == keccak256(abi.encodePacked("Transferred for Legal Review"))) {
            require(targetRole == 4, "SECURITY BLOCK: Receiver must be a Court Liaison (Role 4).");
        }

        address previousCustodian = msg.sender;
        currentCustodian[_itemId] = _newCustodian;
        evidenceRegistry[_itemId].lastAction = _action; 

        evidenceHistory.push(EvidenceLog(_itemId, previousCustodian, _newCustodian, _action, block.timestamp));
        emit CustodyTransferred(_itemId, previousCustodian, _newCustodian, _action, block.timestamp);
    }

    // --- MODULE D: LAB REPORTS (PATCHED) ---
    function submitLabReport(string memory _itemId, string memory _analysis, string memory _evaluation) 
        public 
        onlyAuthorized 
        validString(_itemId)
        validReport(_analysis)       // <-- THE DOS PATCH IS APPLIED HERE
        validReport(_evaluation)     // <-- THE DOS PATCH IS APPLIED HERE
    {
        require(currentCustodian[_itemId] == msg.sender, "Only the current custodian can write reports.");
        require(operativeRoles[msg.sender] == 3, "SECURITY BLOCK: Only Forensic Lab Techs (Role 3) can encode matrices.");
        
        string memory currentAction = evidenceRegistry[_itemId].lastAction;
        bool isLabCheckOut = (keccak256(abi.encodePacked(currentAction)) == keccak256(abi.encodePacked("Checked out for Forensic Imaging"))) || 
                             (keccak256(abi.encodePacked(currentAction)) == keccak256(abi.encodePacked("Checked out for Data Analysis")));
        
        require(isLabCheckOut, "SECURITY BLOCK: Asset is not checked out for Lab Analysis.");

        evidenceRegistry[_itemId].analysisReport = _analysis;
        evidenceRegistry[_itemId].evaluationReport = _evaluation;
        
        emit LabReportUpdated(_itemId, msg.sender, block.timestamp);
    }

    function getTotalLogs() public view returns (uint256) { return evidenceHistory.length; }
    function getTotalItems() public view returns (uint256) { return allItemIds.length; }
}