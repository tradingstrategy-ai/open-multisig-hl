# Open Hyperliquid Multisigner

This application a web user interface for Hyperliquid native multisignature wallets (also known as Hypercore multisig).

- Run locally
- Open source
- Free
- Brutal

![alt text](image.png)

# Beta warning

- Limited functionality. The software supports only certain actions, but new actions are easy to add.

# Requirements

- Basic understanding of running local JavaScript applications from Git
- `pnpm`

# Run

To launch Open Hyperliquid Multisigner:

```shell
pnpm run dev
```

Then go to:

http://localhost:5173/

# Usage

1. One of the multisignature participants creates the value you need to sign
2. They communicate them to others - you can copy-paste the UR:
3. Others connect their wallet and verify values
4. Everyone presses sign

All signers must sign the exact same payload. Coordinate nonce values before signing. Changing any field invalidates previously collected signatures..

# How to create Hyperliquid native multisignature wallet

TODO

# Architecture

- Built with Svelte and Viem

# Support

- [Join Discord for any questions](https://tradingstrategy.ai/community).

# Social media

- [Watch tutorials on YouTube](https://www.youtube.com/@tradingstrategyprotocol)
- [Follow on Twitter](https://twitter.com/TradingProtocol)
- [Follow on Telegram](https://t.me/trading_protocol)
- [Follow on LinkedIn](https://www.linkedin.com/company/trading-strategy/)

# License

MIT.

[Created by Trading Strategy](https://tradingstrategy.ai).
