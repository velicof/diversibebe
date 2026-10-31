// Preserve all vendor files; derive a separate tree for Windows background workers.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const runtime=path.resolve(__dirname,'../../real-supabase-runtime');
const vendor=path.join(runtime,'postgres/pgsql'),derived=path.join(runtime,'postgres-background/pgsql');
for(const part of ['bin','lib','share'])fs.cpSync(path.join(vendor,part),path.join(derived,part),{recursive:true,force:false,errorOnExist:false});
const original=path.join(vendor,'bin/postgres.exe'),target=path.join(derived,'bin/postgres.exe');
const data=fs.readFileSync(original),copy=Buffer.from(data);
if(data.toString('ascii',0,2)!=='MZ')throw new Error('Unexpected executable');
const pe=data.readUInt32LE(0x3c),offset=pe+24+68;
if(data.toString('ascii',pe,pe+4)!=='PE\0\0'||data.readUInt16LE(offset)!==3)throw new Error('Unexpected PE subsystem');
copy.writeUInt16LE(2,offset);
const existing=fs.readFileSync(target);
if(!existing.equals(data)&&!existing.equals(copy))throw new Error('Unexpected derived binary; preserved without overwrite');
if(existing.equals(data))fs.writeFileSync(target,copy);
fs.writeFileSync(path.join(runtime,'private/windows-launcher.json'),JSON.stringify({vendor:original,derived:target,changedField:'PE OptionalHeader.Subsystem 3 -> 2',codeSectionsChanged:false,vendorSha256:crypto.createHash('sha256').update(data).digest('hex'),derivedSha256:crypto.createHash('sha256').update(copy).digest('hex')},null,2));
console.log('Separate Windows background tree prepared; vendor original preserved.');
