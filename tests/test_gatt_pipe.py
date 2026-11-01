import asyncio
import importlib.util
from pathlib import Path
import unittest

MODULE=Path(__file__).resolve().parents[1]/'sources/gar-tools/transports/ble-uart/pc/gatt_pipe.py'
spec=importlib.util.spec_from_file_location('gatt_pipe',MODULE)
pipe=importlib.util.module_from_spec(spec);spec.loader.exec_module(pipe)

class GattPipeTests(unittest.IsolatedAsyncioTestCase):
    async def test_utf8_bytes_reassemble_at_minimum_mtu(self):
        class Client:
            mtu_size=23
            writes=[]
            async def write_gatt_char(self,char,data,response):
                self.writes.append(bytes(data));self_test.assertTrue(response)
        self_test=self;client=Client()
        data=('質問とセッション情報です。'*100+'\n').encode()
        await pipe.write_chunks(client,'rx',data)
        self.assertEqual(b''.join(client.writes),data)
        self.assertTrue(all(len(value)<=20 for value in client.writes))
    async def test_transfer_failure_is_not_retried(self):
        class Client:
            mtu_size=247
            calls=0
            async def write_gatt_char(self,*args,**kwargs):
                self.calls+=1;raise OSError('lost connection')
        client=Client()
        with self.assertRaises(OSError):await pipe.write_chunks(client,'rx',b'x'*600)
        self.assertEqual(client.calls,1)
if __name__=='__main__':unittest.main()
