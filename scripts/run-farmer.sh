#!/bin/bash

# Run farmer
echo "Running farmer..."
./executables/farmer farm path=executables/farmer-temp,size=2GB --reward-address 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY --node-rpc-url ws://127.0.0.1:9944

echo "Both node and farmer are running in parallel."