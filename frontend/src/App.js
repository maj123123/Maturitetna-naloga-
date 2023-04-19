import { useState, useEffect } from "react";
import fetch from "node-fetch";
import axios from "axios";

function EthereumAddress() {
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(null);
  const [usdValue, setUsdValue] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [erc721tokens, setErc721Tokens] = useState([]);
  function handleChange(event) {
    setAddress(event.target.value);
  }

  // Define a function to group the tokens by collection name
  function groupTokensByCollection(tokens) {
    return tokens.reduce((groups, token) => {
      const key = token.nft.collection_name;
      if (!groups[key]) {
        groups[key] = {
          collectionName: key,
          contractAddress: token.nft.contract_address,
          quantity: 0,
          erc721token: token.erc721token,
          totalValue: 0,
        };
      }
      groups[key].quantity += token.quantity;

      groups[key].totalValue += token.quantity * token.erc721token;
      return groups;
    }, {});
  }

  async function fetchTokenPrices(tokens) {
    if (!tokens) return;
    const tokenIds = tokens.map((token) => token.TokenAddress);

    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenIds.join(
          ","
        )}&vs_currencies=usd`
      );
      const data = response.data;

      const updatedTokens = tokens.map((token) => {
        const tokenPrice = data[token.TokenAddress]?.usd;

        const tokenValue = tokenPrice
          ? (parseInt(token.TokenQuantity) /
              Math.pow(10, parseInt(token.TokenDivisor))) *
            tokenPrice
          : 0;

        return {
          ...token,
          tokenValue,
        };
      });

      setTokens(updatedTokens);
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchErcTokenPrice(tokens) {
    if (!tokens) return;

    const contractAddresses = tokens.map((token) => token.nft.contract_address);

    const options = {
      headers: {
        "X-API-KEY": "1071239a-590f-4606-ab25-da9eefc1e238",
      },
    };

    try {
      const responses = await Promise.all(
        contractAddresses.map((contractAddress) => {
          return axios.get(
            `https://data-api.nftgo.io/eth/v1/collection/${contractAddress}/metrics`,
            options
          );
        })
      );

      const updatedTokens = tokens.map((token, index) => {
        const erc721token = responses[index].data?.floor_price.usd || 0;

        return {
          ...token,
          erc721token,
        };
      });

      setErc721Tokens(updatedTokens);
    } catch (error) {
      console.error(error);
      return tokens;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Make a fetch request to the EtherScan API
    const response = await fetch(
      `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=18TGIQ97W4AZ8R2ASZE2E31Q9VG1EFWUU3`
    );

    // Parse the response as JSON
    const data = await response.json();

    // Extract the balance from the response and convert from wei to ether
    const weiBalance = data.result;
    const etherBalance = weiBalance / 10 ** 18;

    // Fetch the ETH/USD exchange rate from CoinGecko
    const exchangeRateResponse = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    const exchangeRateData = await exchangeRateResponse.json();
    const exchangeRate = exchangeRateData.ethereum.usd;

    // Calculate the USD value of the ether balance
    const usdBalance = etherBalance * exchangeRate;

    // Fetch do token api
    const tokenResponse = await fetch(
      `https://api.etherscan.io/api?module=account&action=addresstokenbalance&address=${address}&page=1&offset=100&apikey=18TGIQ97W4AZ8R2ASZE2E31Q9VG1EFWUU3`
    );

    // Parse the response as JSON
    const tokenData = await tokenResponse.json();

    // Extract erc20 tokens from token response
    const erc20Tokens = tokenData.result.filter(
      (tx) => tx.tokenSymbol !== "ETH"
    );

    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-API-KEY": "1071239a-590f-4606-ab25-da9eefc1e238",
      },
    };

    const erc721tokenresponse = await fetch(
      `https://data-api.nftgo.io/eth/v1/address/${address}/portfolio?offset=0&limit=20`,
      options
    );
    const erc721tokenData = await erc721tokenresponse.json();

    const erc721Tokens = erc721tokenData.assets;

    // Set the ether balance and USD balance as state
    setBalance(etherBalance);
    setUsdValue(usdBalance);

    fetchTokenPrices(erc20Tokens);
    fetchErcTokenPrice(erc721Tokens);
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <span
          htmlFor="eth-address"
          style={{ marginLeft: `${35}%`, fontSize: `${2}rem` }}
        >
          Enter your Ethereum address:
        </span>
        <div className="search open">
          <input
            id="eth-address"
            type="text"
            value={address}
            onChange={handleChange}
            className="search-box"
          />
          <button type="submit" className="search-button">
            <span className="search-icon open"></span>
          </button>
        </div>
      </form>
      {balance !== null && (
        <div>
          <p style={{ fontSize: `${1.5}rem`, fontWeight: 200 }}>
            Your Ethereum balance is: {balance.toFixed(0)} ether
          </p>
          {usdValue !== null && (
            <p style={{ fontSize: `${1.5}rem`, fontWeight: 200 }}>
              Your Ethereum balance is worth: {usdValue.toFixed(2)}$
            </p>
          )}
        </div>
      )}
      {tokens.length > 0 && (
        <div>
          <p style={{ fontSize: `${2.5}rem`, fontWeight: 900 }}>
            You have the following ERC-20 tokens:
          </p>
          <table>
            <thead className="table-header">
              <tr>
                <th>Token Name</th>
                <th>Token Address</th>
                <th>Token Quantity</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token, index) => (
                <tr
                  key={token.TokenAddress}
                  className={
                    index % 2 === 0 ? "table-row-even" : "table-row-odd"
                  }
                >
                  <td>
                    {" "}
                    <a
                      className="collection_link"
                      href={`https://etherscan.io/token/${token.TokenAddress}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {token.TokenName}
                    </a>
                  </td>
                  <td>{token.TokenAddress}</td>
                  <td>
                    {(
                      token.TokenQuantity / Math.pow(10, token.TokenDivisor)
                    ).toFixed(0)}
                  </td>

                  <td>
                    {token.tokenValue && `${token.tokenValue.toFixed(2)}$`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div>
            <p style={{ fontSize: `${2.5}rem`, fontWeight: 900 }}>
              You have the following ERC721 tokens:
            </p>
            <table>
              <thead className="table-header">
                <tr>
                  <th>Token Name</th>
                  <th>Token Address</th>
                  <th>Token Quantity</th>
                  <th>Token Floor Price</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(groupTokensByCollection(erc721tokens)).map(
                  (group, index) => (
                    <tr
                      key={index}
                      className={
                        index % 2 === 0 ? "table-row-even" : "table-row-odd"
                      }
                    >
                      <td>{group.collectionName}</td>
                      <td>{group.contractAddress}</td>
                      <td>{group.quantity}</td>
                      <td>{group.erc721token}</td>
                      <td>{group.totalValue.toFixed(2)}$</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default EthereumAddress;
