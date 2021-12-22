import DStorage from "../abis/DStorage.json";
import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Main from "./Main";
import Web3 from "web3";
import "./App.css";

//Declare IPFS
const ipfsClient = require("ipfs-http-client");
const ipfs = ipfsClient({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
}); // leaving out the arguments will default to these values

const App = () => {
  //Set states
  const [state, setState] = useState({
    account: "",
    dstorage: null,
    files: [],
    loading: false,
    type: null,
    name: null,
  });

  const loadWeb3 = async () => {
    //Setting up Web3
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      await window.ethereum.enable();
    } else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider);
    } else {
      window.alert(
        "Non-Ethereum browser detected. You should consider trying Metamask!"
      );
    }
  };

  const loadBlockchainData = async () => {
    //Declare Web3
    const web3 = window.web3;

    //Load account
    const accounts = await web3.eth.getAccounts();
    setState((state) => ({
      ...state,
      account: accounts[0],
    }));

    //Network ID
    const networkId = await web3.eth.net.getId();
    const networkData = DStorage.networks[networkId];

    //IF got connection, get data from contracts
    if (networkData) {
      //Assign contract
      const dstorage = new web3.eth.Contract(DStorage.abi, networkData.address);
      setState((state) => ({
        ...state,
        dstorage,
      }));

      //Get files amount
      const fileCount = await dstorage.methods.fileCount().call();
      setState((state) => ({
        ...state,
        fileCount,
      }));

      //Load files&sort by the newest
      const tempFilesArray = [];
      for (let i = fileCount; i >= 1; i--) {
        const file = await dstorage.methods.files(i).call();
        tempFilesArray.push(file);
      }

      setState((state) => ({
        ...state,
        files: tempFilesArray,
      }));
    } else {
      //Else
      //alert Error
      window.alert("DStorage contract not deployed to detected network.");
    }

    setState((state) => ({
      ...state,
      loading: false,
    }));
  };

  // Get file from user
  const captureFile = (event) => {
    event.preventDefault();

    const file = event.target.files[0];
    const reader = new window.FileReader();

    reader.readAsArrayBuffer(file);
    reader.onloadend = () => {
      setState((state) => ({
        ...state,
        buffer: Buffer(reader.result),
        type: file.type,
        name: file.name,
      }));
    };
  };

  // useEffect(() => {
  //   console.log("buffer", state.buffer)
  // }, [state])

  //Upload File
  const uploadFile = (description) => {
    console.log("Submitting file to IPFS");

    //Add file to the IPFS
    ipfs.add(state.buffer, (error, result) => {
      console.log("IPFS result", result);

      //Check If error
    if (error) {
      //Return error
      console.error(error);
      return;
    }

    //Set state to loading
    setState((state) => ({
      ...state,
      loading: true,
    }));

    //Assign value for the file without extension
    if (state.type === "") {
      setState((state) => ({
        ...state,
        type: "none",
      }));
    }

    //Call smart contract uploadFile function
    state.dstorage.methods
      .uploadFile(
        result[0].hash,
        result[0].size,
        state.type,
        state.name,
        description
      )
      .send({ from: state.account })
      .on("transactionHash", (hash) => {
        setState((state) => ({
          ...state,
          loading: false,
          type: null,
          name: null,
        }));

        window.location.reload();
      })
      .on("error", (e) => {
        window.alert("Error");
        setState((state) => ({
          ...state,
          loading: false,
        }));
      });
    });

    
  };

  useEffect(() => {
    const run = async () => {
      await loadWeb3();
      await loadBlockchainData();
    };

    run();
  }, []);

  return (
    <div>
      <Navbar account={state.account} />
      {state.loading ? (
        <div id="loader" className="text-center mt-5">
          <p>Loading...</p>
        </div>
      ) : (
        <Main
          files={state.files}
          captureFile={captureFile}
          uploadFile={uploadFile}
        />
      )}
    </div>
  );
};

export default App;
