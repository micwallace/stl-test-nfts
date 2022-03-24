
Moralis.initialize(MORALIS_APP_ID); // Application id from moralis.io
Moralis.serverURL = MORALIS_SERVER_URL; //Server url from moralis.io

const nft_contract_address = "0xf19c56362cfdf66f7080e4a58bf199064e57e07c";
/*
Available deployed contracts
Ethereum Rinkeby v2: 0xf19c56362cfdf66f7080e4a58bf199064e57e07c
Ethereum Rinkeby: 0xafd1a2f17ce2a694d2ef649fe5ba51cc0282448a
Ethereum Ropsten: 0xd1a108a5a39bea5daedba94b29a3913af7eca594
*/

const web3 = new Web3(window.ethereum);

//frontend logic

async function login(){

    document.getElementById('submit').setAttribute("disabled", null);
    document.getElementById('username').setAttribute("disabled", null);
    document.getElementById('useremail').setAttribute("disabled", null);

    Moralis.Web3.authenticate().then(function (user) {

        user.set("name",document.getElementById('username').value);
        user.set("email",document.getElementById('useremail').value);
        user.save();

        document.getElementById("upload").removeAttribute("disabled");
        document.getElementById("file").removeAttribute("disabled");
        document.getElementById("name").removeAttribute("disabled");
        document.getElementById("description").removeAttribute("disabled");
        document.getElementById("to-address").removeAttribute("disabled");
    })
}

async function upload(){

    const fileInput = document.getElementById("file");
    const toAddress = document.getElementById("to-address").value;
    const data = fileInput.files[0];
    const imageFile = new Moralis.File(data.name, data);

    document.getElementById('upload').setAttribute("disabled", null);
    document.getElementById('file').setAttribute("disabled", null);
    document.getElementById('name').setAttribute("disabled", null);
    document.getElementById('description').setAttribute("disabled", null);
    document.getElementById('to-address').setAttribute("disabled", null);

    try {
        await imageFile.saveIPFS();
        const imageURI = imageFile.ipfs();
        const metadata = {
            "name":document.getElementById("name").value,
            "description":document.getElementById("description").value,
            "image":imageURI
        }

        console.log("Minting token with metadata: ");
        console.log(metadata);

        const metadataFile = new Moralis.File("metadata.json", {base64 : btoa(JSON.stringify(metadata))});
        await metadataFile.saveIPFS();
        const metadataURI = metadataFile.ipfs();

        console.log("Metadata URI: " + metadataURI);

        // If the contract wanted to just store the hash of IPFS file and use gateway defined by base URL.
        /*const ipfsHash = metadataURI.substring(metadataURI.lastIndexOf("/") + 1);
        console.log("IPFS hash: " + ipfsHash);
        const txt = await mintToken(ipfsHash);*/

        const txt = await mintToken(toAddress, metadataURI);

        await notify("Your NFT was minted in transaction", txt);

    } catch (e){
        console.log("Transaction failed: ");
        console.log(e);
        alert("Transaction failed, see console for more details");
    }

    document.getElementById("upload").removeAttribute("disabled");
    document.getElementById("file").removeAttribute("disabled");
    document.getElementById("name").removeAttribute("disabled");
    document.getElementById("description").removeAttribute("disabled");
    document.getElementById("to-address").removeAttribute("disabled");
}

async function mintWithUri(){

    document.getElementById('to-address-uri').setAttribute("disabled", null);
    document.getElementById('token-uri').setAttribute("disabled", null);
    document.getElementById('mint-with-uri').setAttribute("disabled", null);

    try {
        const toAddress = document.getElementById("to-address-uri").value;
        const metadataURI = document.getElementById("token-uri").value;

        const txt = await mintToken(toAddress, metadataURI);

        await notify("Your NFT was minted in transaction", txt);

    } catch (e){
        console.log("Transaction failed: ");
        console.log(e);
        alert("Transaction failed, see console for more details");
    }

    document.getElementById("to-address-uri").removeAttribute("disabled");
    document.getElementById("token-uri").removeAttribute("disabled");
    document.getElementById("mint-with-uri").removeAttribute("disabled");
}

async function mintToken(toAddress, uri){

    if (!toAddress.trim())
        toAddress = ethereum.selectedAddress;

    const encodedFunction = web3.eth.abi.encodeFunctionCall({
        name: "safeMint",
        type: "function",
        inputs: [
            {
                type: 'address',
                name: 'account'
            },
            {
                type: 'string',
                name: 'tokenURI'
            }
        ]
    }, [toAddress, uri]);

    const transactionParameters = {
        to: nft_contract_address,
        from: ethereum.selectedAddress,
        data: encodedFunction
    };

    return await ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters]
    })
}

async function updateTokenUri(){

    document.getElementById('update-token').setAttribute("disabled", null);
    document.getElementById('new-token-uri').setAttribute("disabled", null);
    document.getElementById('update-uri').setAttribute("disabled", null);

    try {
        const tokenId = document.getElementById("update-token").value;
        const metadataURI = document.getElementById("new-token-uri").value;

        const encodedFunction = web3.eth.abi.encodeFunctionCall({
                name: "updateTokenURI",
                type: "function",
                inputs: [
                    {
                        type: 'uint256',
                        name: 'tokenId'
                    },
                    {
                        type: 'string',
                        name: 'tokenURI'
                    }
                ]
            },
            [tokenId, metadataURI]);

        const transactionParameters = {
            to: nft_contract_address,
            from: ethereum.selectedAddress,
            data: encodedFunction
        };
        const txt = await ethereum.request({
            method: 'eth_sendTransaction',
            params: [transactionParameters]
        });

        await notify("Token URI updated in transaction", txt);

    } catch (e){
        console.log("Transaction failed: ");
        console.log(e);
        alert("Transaction failed, see console for more details");
    }

    document.getElementById("update-token").removeAttribute("disabled");
    document.getElementById("new-token-uri").removeAttribute("disabled");
    document.getElementById("update-uri").removeAttribute("disabled");

}

async function getTokenUri(){

    document.getElementById('get-token-id').setAttribute("disabled", null);
    document.getElementById('get-uri').setAttribute("disabled", null);

    const tokenId = document.getElementById("get-token-id").value;

    const encodedFunction = web3.eth.abi.encodeFunctionCall({
            name: "tokenURI",
            type: "function",
            inputs: [
                {
                    type: 'uint256',
                    name: 'tokenId'
                }
            ]
        },
        [tokenId]);

    const transactionParameters = {
        to: nft_contract_address,
        from: ethereum.selectedAddress,
        data: encodedFunction
    };

    var result = await ethereum.request({
        method: 'eth_call',
        params: [transactionParameters, "latest"]
    });

    result = web3.eth.abi.decodeParameters(["string"], result)[0];

    alert(result);

    document.getElementById("get-token-id").removeAttribute("disabled");
    document.getElementById("get-uri").removeAttribute("disabled");
}

// Approve minter
async function grantOrRevokeMinterRole(revoke = false){

    let minterRole = web3.utils.keccak256('MINTER_ROLE');
    let address = document.getElementById("address").value;

    document.getElementById('address').setAttribute("disabled", null);
    document.getElementById('grant-role').setAttribute("disabled", null);
    document.getElementById('revoke-role').setAttribute("disabled", null);

    try {
        const encodedFunction = web3.eth.abi.encodeFunctionCall({
                name: revoke ? "revokeRole" : "grantRole",
                type: "function",
                inputs: [
                    {
                        type: 'bytes32',
                        name: 'role'
                    },
                    {
                        type: 'address',
                        name: 'account'
                    }
                ]
            },
            [minterRole, address]);

        const transactionParameters = {
            to: nft_contract_address,
            from: ethereum.selectedAddress,
            data: encodedFunction
        };
        const txt = await ethereum.request({
            method: 'eth_sendTransaction',
            params: [transactionParameters]
        });

        await notify("Minting rights " + (revoke ? "revoked" : "granted"), txt);

    } catch (e){
        console.log("Transaction failed: ");
        console.log(e);
        alert("Transaction failed, see console for more details");
    }

    document.getElementById("address").removeAttribute("disabled");
    document.getElementById("grant-role").removeAttribute("disabled");
    document.getElementById("revole-role").removeAttribute("disabled");
}


async function notify(label, _txt){
    document.getElementById("resultSpace").innerHTML =
        `<input disabled = "true" id="result" type="text" class="form-control" placeholder="Description" aria-label="URL" aria-describedby="basic-addon1" value="${label} ${_txt}">`;
}