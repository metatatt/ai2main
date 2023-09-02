![image](https://github.com/metatatt/baton/assets/100538673/37936471-5b7e-41ec-97e0-485e5b7e7f02)


# *process flow* HandCheckr

## events table
|sevents|state |prompt|data/constructor|error
|--|--|--|--|--|
|start | null|say 'Hey Computer'|init(), iniAgora()
|voice | 1|await motion...|
|motion detected |2|await gesture|
|gesture detected |3|say 'check'|.boxLoc(), typeOf()|'gesture first', rout to 2
|break[]|--|--|--|--|
|check or upload |4|checking now|.imageBlob()|
|md ready |5|showing result|save to Azure storage(?)

> Sept 02, 2023
