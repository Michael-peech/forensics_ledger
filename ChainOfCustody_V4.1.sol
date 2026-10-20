// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ForensicsLedgerV4_4_1 {
    
    // --- ACCESS CONTROL & RBAC ---
    mapping(address => bool) public isAdmin;
    uint256 public adminCount; // FIX: Tracks total active admins
    
    mapping(address => uint8) public operativeRoles;
    
    // --- IDENTITY & CREDENTIALS ---
    mapping(address => string) public operativeUsernames;
    mapping(string => bool) public isUsernameTaken;
    mapping(address => uint256) public operativeBadges;
    mapping(uint8 => uint256) private roleCounters;

    // --- EVIDENCE STRUCTURES ---
    struct Evidence {
        string caseName;
        string itemId;
        string walrusBlobId;
        string analysisReport;
        string evaluationReport;
        string lastAction;
    }

    struct Log {
        string itemId;
        address from;
        address to;
        string action;
        uint256 timestamp;
    }

    mapping(string => Evidence) public evidenceRegistry;
    mapping(string => address) public currentCustodian;
    mapping(uint256 => Log) public evidenceHistory;
    mapping(string => bool) public itemExists;
    
    uint256 public totalItems;
    uint256 public totalLogs;

    // --- EVENTS ---
    event AdminAdded(address indexed newAdmin, address indexed addedBy);
    event AdminRemoved(address indexed removedAdmin, address indexed removedBy);
    event OperativeAuthorized(address indexed operative, uint8 role, uint256 badgeNumber);
    event RoleReassigned(address indexed operative, uint8 oldRole, uint8 newRole, uint256 timestamp);
    event UsernameRegistered(address indexed operative, string username);
    event EvidenceLogged(string indexed itemId, string caseName, address indexed custodian, uint256 timestamp);
    event CustodyTransferred(string indexed itemId, address from, address indexed to, string action, uint256 timestamp);
    event LabReportUpdated(string indexed itemId, address indexed tech, uint256 timestamp);

    // --- MODIFIERS ---
    modifier onlyAdmin() {
        require(isAdmin[msg.sender], "ACCESS DENIED: System Admin Clearance Required");
        _;
    }

    modifier onlyRegistered() {
        require(operativeRoles[msg.sender] > 0, "ACCESS DENIED: Unregistered Operative");
        _;
    }

    // --- CONSTRUCTOR ---
    constructor() {
        // Grant God-Mode (Admin) to Deployer. Role ID remains 0 until manually authorized.
        isAdmin[msg.sender] = true; 
        adminCount = 1; // Initialize the admin life-raft
    }

    // --- 1. SYSTEM ADMIN CONTROLS ---
    function addAdmin(address _newAdmin) public onlyAdmin {
        require(!isAdmin[_newAdmin], "Address is already an Admin");
        isAdmin[_newAdmin] = true;
        adminCount++; // Increment total admins
        emit AdminAdded(_newAdmin, msg.sender);
    }

    function removeAdmin(address _admin) public onlyAdmin {
        require(msg.sender != _admin, "You cannot remove yourself");
        require(isAdmin[_admin], "Address is not an Admin");
        require(adminCount > 1, "CRITICAL: Cannot remove the last remaining system admin"); // FIX: Life-raft logic
        
        isAdmin[_admin] = false;
        adminCount--; // Decrement total admins
        emit AdminRemoved(_admin, msg.sender);
    }

    function authorizeNewOperative(address _operative, uint8 _roleId) public onlyAdmin {
        require(_roleId >= 1 && _roleId <= 4, "Invalid Clearance Level");
        require(operativeRoles[_operative] == 0, "Operative already exists. Use reassignRole.");
        
        operativeRoles[_operative] = _roleId;
        
        // Counter strictly increases to ensure mathematically unique badges, regardless of transfers
        roleCounters[_roleId]++;
        operativeBadges[_operative] = (_roleId * 1000) + roleCounters[_roleId];

        emit OperativeAuthorized(_operative, _roleId, operativeBadges[_operative]);
    }

    function reassignOperativeRole(address _operative, uint8 _newRoleId) public onlyAdmin {
        require(_newRoleId >= 1 && _newRoleId <= 4, "Invalid Clearance Level");
        uint8 oldRole = operativeRoles[_operative];
        require(oldRole > 0, "Operative is not authorized yet");
        require(oldRole != _newRoleId, "Operative already holds this role");

        operativeRoles[_operative] = _newRoleId;
        
        emit RoleReassigned(_operative, oldRole, _newRoleId, block.timestamp);
    }

    // --- 2. IDENTITY REGISTRATION ---
    function registerUsername(string memory _username) public onlyRegistered {
        require(bytes(operativeUsernames[msg.sender]).length == 0, "Username already registered");
        require(!isUsernameTaken[_username], "Username is already claimed");
        require(bytes(_username).length >= 4 && bytes(_username).length <= 15, "Username must be 4-15 characters");

        isUsernameTaken[_username] = true;
        operativeUsernames[msg.sender] = _username;

        emit UsernameRegistered(msg.sender, _username);
    }

    // --- 3. MODULE A: INTAKE ---
    function logInitialSeizure(string memory _caseName, string memory _itemId, string memory _walrusBlobId) public onlyRegistered {
        require(operativeRoles[msg.sender] == 1 || isAdmin[msg.sender], "Clearance Level 1 Required");
        require(!itemExists[_itemId], "Evidence ID already exists");

        evidenceRegistry[_itemId] = Evidence({
            caseName: _caseName,
            itemId: _itemId,
            walrusBlobId: _walrusBlobId,
            analysisReport: "",
            evaluationReport: "",
            lastAction: "Initial Seizure"
        });

        itemExists[_itemId] = true;
        currentCustodian[_itemId] = msg.sender;
        
        totalItems++;

        evidenceHistory[totalLogs] = Log({
            itemId: _itemId,
            from: address(0),
            to: msg.sender,
            action: "Initial Seizure",
            timestamp: block.timestamp
        });
        totalLogs++;

        emit EvidenceLogged(_itemId, _caseName, msg.sender, block.timestamp);
    }

    // --- 4. MODULE B: CUSTODY TRANSFER ---
    function transferCustody(string memory _itemId, address _newCustodian, string memory _action) public onlyRegistered {
        require(itemExists[_itemId], "Evidence ID does not exist");
        require(currentCustodian[_itemId] == msg.sender, "You do not have active custody");
        require(operativeRoles[_newCustodian] > 0, "Target address is not authorized");

        evidenceRegistry[_itemId].lastAction = _action;
        currentCustodian[_itemId] = _newCustodian;

        evidenceHistory[totalLogs] = Log({
            itemId: _itemId,
            from: msg.sender,
            to: _newCustodian,
            action: _action,
            timestamp: block.timestamp
        });
        totalLogs++;

        emit CustodyTransferred(_itemId, msg.sender, _newCustodian, _action, block.timestamp);
    }

    // --- 5. MODULE D: LAB TERMINAL ---
    function submitLabReport(string memory _itemId, string memory _analysis, string memory _evaluation) public onlyRegistered {
        require(itemExists[_itemId], "Evidence ID does not exist");
        require(currentCustodian[_itemId] == msg.sender, "Active custody required to encode reports");
        require(operativeRoles[msg.sender] == 3 || isAdmin[msg.sender], "Clearance Level 3 Required");

        evidenceRegistry[_itemId].analysisReport = _analysis;
        evidenceRegistry[_itemId].evaluationReport = _evaluation;

        emit LabReportUpdated(_itemId, msg.sender, block.timestamp);
    }
}
