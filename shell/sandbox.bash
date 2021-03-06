# This script helps you to create debootstrap environments with fakeroot and
# fakechroot.
#
# how to install:
# 1. add `source /path/to/sandbox.bash' in your .bashrc
# or
# 2. cp /path/to/sandbox.bash /etc/bash_completion.d
#
# functions:
# mksandbox
# sandbox
# rmsandbox
# lssandbox

__sandbox_derive_home__() {
    local sb_home="${SANDBOX_HOME}"

    if [ -z "${sb_home}" ] ; then
        sb_home="${HOME}/.sandboxes"
    fi

    echo "${sb_home}"
    return 0
}

__sandbox_verify_home__() {
    local ret=0
    if [ ! -d "${SANDBOX_HOME}" ] ; then
        mkdir -p "${SANDBOX_HOME}"
        ret=$?
    fi
    return ${ret}
}

__sandbox_show_environments__() {
    __sandbox_verify_home__ || return 1

    pushd "${SANDBOX_HOME}" >/dev/null
    for tmp in * ; do
        echo "${tmp}"
    done 2>/dev/null | grep -v '^\*$' | sort
    popd >/dev/null

    return 0
}

__sandbox_verify_environment__() {
    __sandbox_verify_home__ || return 1

    local name="$1"
    local path="${SANDBOX_HOME}/${name}"
    local state_file="${path}/state"
    local env_path="${path}/environment"

    if [ -z "${name}" ] || [ ! -d "${path}" ] || [ ! -f "${state_file}" ] || [ ! -d "${env_path}" ] ; then
        return 1
    fi

    return 0
}

sandbox() {
    __sandbox_sandbox_usage__() {
        cat <<EOF
usage: sandbox <sandbox_name> [<command> <args>...]
    sandbox_name: the sandbox name
    command: the command to execute, if omitted, \$SHELL -i will used
    args: arguments of given command
EOF
    }

    local name="$1"
    if [ -z "${name}" ] ; then
        __sandbox_sandbox_usage__
        return 1
    fi
    __sandbox_verify_environment__ "${name}" || return 1

    local path="${SANDBOX_HOME}/${name}"
    local state_file="${path}/state"
    local env_path="${path}/environment"

    shift
    HOME="/root" TERM="${TERM}" fakeroot -i "${state_file}" -s "${state_file}" fakechroot chroot "${env_path}" $@

    return 0
}

rmsandbox() {
    __sandbox_rmsandbox_usage__() {
        echo "usage: rmsandbox <sandbox_name>"
    }

    local name="$1"
    if [ -z "${name}" ] ; then
        __sandbox_sandbox_usage__
        return 1
    fi
    __sandbox_verify_environment__ "${name}" || return 1

    local path="${SANDBOX_HOME}/${name}"

    rm -rf "${path}"

    return 0
}

lssandbox() {
    __sandbox_verify_home__ || return 1

    __sandbox_rmsandbox_usage__() {
        echo "usage: lssandbox <sandbox_name>"
    }

    pushd "${SANDBOX_HOME}" >/dev/null
    for tmp in * ; do
        echo "${tmp}"
    done 2>/dev/null | grep -v '^\*$' | sort
    popd >/dev/null

    return 0
}

__sandbox_setup_completion__() {
    __sandbox_environments__() {
        local cur="${COMP_WORDS[COMP_CWORD]}"
        COMPREPLY=( $(compgen -W "$(__sandbox_show_environments__)" -- ${cur}) )
    }
    complete -o nospace -o default -F __sandbox_environments__ sandbox
    complete -o nospace -o default -F __sandbox_environments__ rmsandbox

    return 0
}

__sandbox_initialize__() {
    export SANDBOX_HOME="$(__sandbox_derive_home__)"
    export SANDBOX_SOURCE="$(readlink -m "${BASH_SOURCE[0]}")"

    __sandbox_verify_home__ || return 1

    __sandbox_setup_completion__

    return 0
}

__sandbox_get_mirror__() {
    # TODO dont hard code
    local debian='http://ftp.jp.debian.org/debian/'
    local ubuntu='http://jp.archive.ubuntu.com/ubuntu/'

    case "$1" in
        # always invariant
        stable|testing|unstable|sid)
            echo "$debian"
            ;;
        # current stable
        squeeze)
            echo "$debian"
            ;;
        # current testing
        wheezy)
            echo "$debian"
            ;;
        # ex-ex-LTS
        hardy)
            echo "$ubuntu"
            ;;
        # ex-LTS
        lucid)
            echo "$ubuntu"
            ;;
        # LTS
        precise)
            echo "$ubuntu"
            ;;
        # others
        oneiric|quantal|raring)
            echo "$ubuntu"
            ;;
        *)
            echo ""
            return 1
            ;;
    esac

    return 0
}

mksandbox() {
    __sandbox_verify_home__ || return 1

    __sandbox_mksandbox_usage__() {
        cat <<EOF
usage: mksandbox <options...> [<optional options...>] <sandbox_name>
    options:
        -a, --arch: i386 or amd64
        -s, --suite: distro suite
    optional options:
        --tmp: share /tmp from host
    sandbox_name: the sandbox name
EOF
        return 0
    }

    local tmp=$(getopt -o a:s: -l arch:,suite:,tmp -n "$0" -- "$@")
    if [ $? -ne 0 ] ; then
        __sandbox_mksandbox_usage__
        return 1
    fi
    eval set -- "${tmp}"

    local arch=
    local suite=
    local dpkg=
    local shared_tmp=
    while true ; do
        case "$1" in
            -a|--arch)
                arch="$2"
                shift 2
                ;;
            -s|--suite)
                suite="$2"
                shift 2
                ;;
            --tmp)
                shared_tmp='shared_tmp'
                shift
                ;;
            --)
                shift
                break
                ;;
            *)
                __sandbox_mksandbox_usage__
                return 1
        esac
    done

    if [ $# -ne 1 ] || [ -z "${arch}" ] || [ -z "${suite}" ] ; then
        __sandbox_mksandbox_usage__
        return 1
    fi
    local mirror="$(__sandbox_get_mirror__ "${suite}")"
    if [ $? -ne 0 ] ; then
        echo "unknown distro suite: ${suite}"
        return 1
    fi

    local name="$1"
    local path="${SANDBOX_HOME}/${name}"

    if [ -e "${path}" ] ; then
        echo "${name} exists"
        return 1
    fi

    mkdir -p "${path}"
    local state_file="${path}/state"
    local path="${path}/environment"

    # create environment
    fakeroot -s "${state_file}" fakechroot debootstrap --variant=fakechroot --arch="${arch}" "${suite}" "${path}" "${mirror}"
    # touch debian_chroot
    echo "${name}" > "${path}/etc/debian_chroot"

    if [ -n "${shared_tmp}" ] ; then
        pushd "${path}" > /dev/null
        rmdir 'tmp'
        ln -s '/tmp'
        popd > /dev/null
    fi

    return 0
}

__sandbox_initialize__

# vim: ts=4 sts=4 sw=4 et
# kate: space-indent on; indent-width 4; mixedindent off; replace-tabs on;
