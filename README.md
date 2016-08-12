# ghc
Lazy GitHub clone: navigate files in CLI without a clone (tested in macOS). 

I use GitHub a lot and found it painful to browser files (on the web app) and also it's very slow to clone big repos. What I really want is just _only download files I need_. Octotree is a great extension for Chrome but I'd like to build a tool for CLI. 

Ghc is a 2-hour hack. So, if you think it useful and want to help improving, feel free to submit an issue / question / PR. Thanks! 

## Install
Please ensure you have nodejs >= 6 and npm installed.

`$ npm i ghc -g`

## Usage

### Init & enter
`$ ghc -i <username>/<repository>` (master as default branch)  
`$ ghc -i <username>/<repository> -b <branch>`

which will open a customized ghc shell. The shell supports very basic output format, highlight, autocomplete and command history.

### Commands
`$ ls [path]`  
`$ cd <path>`  
`$ cat <file>`: download that file (and cat it)  
`$ subl <file>`: download that file (and sublime it)  
`$ atom <file>`: download that file (and atom it)  

### Exit

Exit the ghc shell.

`$ exit`

### Other
Other instructions will fallback to execute in bash. i.e. `pwd`, `tree`, `clear`, etc.

## Demo
```zsh
~/temp
❯ ghc -i torvalds/linux
Initializing torvalds/linux#master...
OK
Initializing local cache...
OK

∆ torvalds/linux [master] 
> ls
.cocciconfig             .get_maintainer.ignore   .gitignore               
.mailmap                 COPYING                  CREDITS                  
Documentation            Kbuild                   Kconfig                  
MAINTAINERS              Makefile                 README                   
REPORTING-BUGS           arch                     block                    
...

∆ torvalds/linux [master] 
> cd kernel

∆ torvalds/linux [master] kernel
> ls
.gitignore               Kconfig.freezer          Kconfig.hz               
Kconfig.locks            Kconfig.preempt          Makefile                 
acct.c                   async.c                  audit.c                  
audit.h                  audit_fsnotify.c         audit_tree.c             
audit_watch.c            auditfilter.c            auditsc.c                
...

∆ torvalds/linux [master] kernel
> cat up.c
/*
 * Uniprocessor-only support functions.  The counterpart to kernel/smp.c
 */

#include <linux/interrupt.h>
#include <linux/kernel.h>
#include <linux/export.h>
#include <linux/smp.h>

int smp_call_function_single(int cpu, void (*func) (void *info), void *info,
        int wait)
{
  unsigned long flags;
...

∆ torvalds/linux [master] kernel
> exit

~/temp
❯ tree
.
└── torvalds_linux_master_ghc
    └── kernel
        └── up.c

2 directories, 1 file

```

## License
2016, Shu Ding, MIT licensed.

<3
