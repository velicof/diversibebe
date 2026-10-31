param([Parameter(Mandatory=$true)][string]$Descriptor)
$ErrorActionPreference='Stop'
$taskSpec=Get-Content -LiteralPath $Descriptor -Raw|ConvertFrom-Json
foreach($taskVariable in $taskSpec.environment.PSObject.Properties){[Environment]::SetEnvironmentVariable($taskVariable.Name,[string]$taskVariable.Value,'Process')}
$taskStart=@{FilePath=$taskSpec.command;WorkingDirectory=$taskSpec.cwd;WindowStyle='Hidden';RedirectStandardOutput=$taskSpec.stdout;RedirectStandardError=$taskSpec.stderr;PassThru=$true}
if($taskSpec.args.Count){$taskStart.ArgumentList=@($taskSpec.args|ForEach-Object{'"'+([string]$_).Replace('"','\"')+'"'})}
$taskChild=Start-Process @taskStart
Write-Output $taskChild.Id
