  flowchart TD
      A{routeNum}
      A -->|0| B[sidePage0.md]-->C['flashing 2s infinite']
      A -->|1| D['']
      A -->|2| E[sidePage2.md]-->F['flashing 1s infinite']
      A -->|3| G['']
      A -->|4| H[sidePage4.md]-->I['flashing 2s infinite']-->J[inspectSnapShot]
      A -->|5| K[sidePage5.md]-->L[showReport]