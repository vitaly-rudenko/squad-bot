#!/bin/sh

WFI_TIMEOUT=15
WFI_QUIET=0

echoerr() {
  if [ "$WFI_QUIET" -ne 1 ]; then printf "%s\n" "$*" 1>&2; fi
}

usage() {
  exitcode="$1"
  cat << USAGE >&2
Usage:
  $cmdname host:port [-t timeout] [-- command args]
  -q | --quiet                        Do not output any status messages
  -t WFI_TIMEOUT | --timeout=timeout      Timeout in seconds, zero for no timeout
  -- COMMAND ARGS                     Execute command with args after the test finishes
USAGE
  exit "$exitcode"
}

wait_for() {
  for i in `seq $WFI_TIMEOUT` ; do
    nc -z "$WFI_HOST" "$WFI_PORT" > /dev/null 2>&1

    result=$?
    if [ $result -eq 0 ] ; then
      if [ $# -gt 0 ] ; then
        exec "$@"
      fi
      exit 0
    fi
    sleep 1
  done
  echo "Operation timed out" >&2
  exit 1
}

while [ $# -gt 0 ]
do
  case "$1" in
    *:* )
    WFI_HOST=$(printf "%s\n" "$1"| cut -d : -f 1)
    WFI_PORT=$(printf "%s\n" "$1"| cut -d : -f 2)
    shift 1
    ;;
    -q | --quiet)
    WFI_QUIET=1
    shift 1
    ;;
    -t)
    WFI_TIMEOUT="$2"
    if [ "$WFI_TIMEOUT" = "" ]; then break; fi
    shift 2
    ;;
    --timeout=*)
    WFI_TIMEOUT="${1#*=}"
    shift 1
    ;;
    --)
    shift
    break
    ;;
    --help)
    usage 0
    ;;
    *)
    echoerr "Unknown argument: $1"
    usage 1
    ;;
  esac
done

if [ "$WFI_HOST" = "" -o "$WFI_PORT" = "" ]; then
  echoerr "Error: you need to provide a host and port to test."
  usage 2
fi

wait_for "$@"
