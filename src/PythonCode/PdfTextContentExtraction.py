import sys
import json
import pymupdf
import uuid


filePath=sys.argv[1]
fileId=sys.argv[2]
with pymupdf.open(filePath) as doc:
    metadata=doc.metadata
    sharedObject={}
    sharedObject["fileId"]=fileId
    returnedObject={}
    for (page) in doc:
        try:
            text=page.get_text()
            if(len(text)==0):
                continue
            returnedObject["content"]=text
        except Exception as e:
            print(e)
            raise e
        for key in sharedObject:
            returnedObject[key]=sharedObject[key]
        returnedObject["page"]=page.number +1
        returnedObject["id"]=str(uuid.uuid4())
        print(json.dumps(returnedObject))
