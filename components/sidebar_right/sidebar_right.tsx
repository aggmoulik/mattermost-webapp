// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import classNames from 'classnames';

import {Channel} from 'mattermost-redux/types/channels';

import {trackEvent} from 'actions/telemetry_actions';
import Constants from 'utils/constants';
import * as Utils from 'utils/utils';

import FileUploadOverlay from 'components/file_upload_overlay';
import RhsThread from 'components/rhs_thread';
import RhsCard from 'components/rhs_card';
import Search from 'components/search/index';

import RhsPlugin from 'plugins/rhs_plugin';

export type Props = {
    isExpanded: boolean;
    isOpen: boolean;
    currentUserId: string;
    channel?: Channel;
    postRightVisible?: boolean;
    postCardVisible?: boolean;
    searchVisible: boolean;
    isMentionSearch?: boolean;
    isFlaggedPosts?: boolean;
    isPinnedPosts?: boolean;
    isPluginView?: boolean;
    previousRhsState?: string;
    rhsChannel: Channel;
    selectedPostId?: string;
    selectedPostCardId?: string;
    actions: {
        setRhsExpanded: (expanded: boolean) => void;
        showPinnedPosts: (channelId?: string) => void;
        openRHSSearch: () => void;
        closeRightHandSide: () => void;
        openAtPrevious: (previous: unknown) => void;
        updateSearchTerms: (terms: string) => void;
    };
};

export type State = {
    isOpened: boolean;
}

export default class SidebarRight extends React.PureComponent<Props, State> {
    sidebarRight: React.RefObject<HTMLDivElement>;
    previous: { searchVisible: boolean | undefined; isMentionSearch: boolean | undefined; isPinnedPosts: boolean | undefined; isFlaggedPosts: boolean | undefined; selectedPostId: string | undefined; selectedPostCardId: string | undefined; previousRhsState: string | undefined } | undefined;
    toggleSize?: string;
    focusSearchBar: any;
    public constructor(props: Props) {
        super(props);

        this.sidebarRight = React.createRef();
        this.state = {
            isOpened: false,
        };
    }

    setPrevious = (): void => {
        if (this.props.isOpen) {
            this.previous = {
                searchVisible: this.props.searchVisible,
                isMentionSearch: this.props.isMentionSearch,
                isPinnedPosts: this.props.isPinnedPosts,
                isFlaggedPosts: this.props.isFlaggedPosts,
                selectedPostId: this.props.selectedPostId,
                selectedPostCardId: this.props.selectedPostCardId,
                previousRhsState: this.props.previousRhsState,
            };
        }
    }

    handleShortcut = (e: { preventDefault: () => void }): void => {
        if (Utils.cmdOrCtrlPressed(e) && Utils.isKeyPressed(e, Constants.KeyCodes.PERIOD)) {
            e.preventDefault();
            if (this.props.isOpen) {
                this.props.actions.closeRightHandSide();
            } else {
                this.props.actions.openAtPrevious(this.previous);
            }
        }
    }

    public componentDidMount(): void {
        window.addEventListener('resize', this.determineTransition);
        document.addEventListener('keydown', this.handleShortcut);
        this.determineTransition();
    }

    componentWillUnmount(): void {
        window.removeEventListener('resize', this.determineTransition);
        document.removeEventListener('keydown', this.handleShortcut);
        if (this.sidebarRight.current) {
            this.sidebarRight.current.removeEventListener('transitionend', this.onFinishTransition);
        }
    }

    componentDidUpdate(prevProps: Props): void {
        const wasOpen = prevProps.searchVisible || prevProps.postRightVisible;
        const isOpen = this.props.searchVisible || this.props.postRightVisible;

        if (!wasOpen && isOpen) {
            this.determineTransition();
            trackEvent('ui', 'ui_rhs_opened');
        }

        const {actions, isPinnedPosts, rhsChannel, channel} = this.props;
        if (isPinnedPosts && prevProps.isPinnedPosts === isPinnedPosts && rhsChannel.id !== prevProps.rhsChannel.id) {
            actions.showPinnedPosts(rhsChannel.id);
        }

        if (channel && prevProps.channel && (channel.id !== prevProps.channel.id)) {
            this.props.actions.setRhsExpanded(false);
        }

        this.setPrevious();
    }

    determineTransition = (): void => {
        const transitionInfo = window.getComputedStyle(this.sidebarRight.current as Element).getPropertyValue('transition');
        const hasTransition = Boolean(transitionInfo) && transitionInfo !== 'all 0s ease 0s';

        if (this.sidebarRight.current && hasTransition) {
            this.setState({isOpened: this.props.isOpen});
            this.sidebarRight.current.addEventListener('transitionend', this.onFinishTransition);
        } else {
            this.setState({isOpened: true});
            if (this.sidebarRight.current) {
                this.sidebarRight.current.removeEventListener('transitionend', this.onFinishTransition);
            }
        }
    }

    onFinishTransition = (e: { propertyName: string }): void => {
        if (e.propertyName === 'transform') {
            this.setState({isOpened: this.props.isOpen});
        }
    }

    onShrink = (): void => {
        this.props.actions.setRhsExpanded(false);
    };

    handleUpdateSearchTerms = (term: string): void => {
        this.props.actions.updateSearchTerms(term);
        this.focusSearchBar();
    }

    getSearchBarFocus = (focusSearchBar: unknown): void => {
        this.focusSearchBar = focusSearchBar;
    }

    public render(): JSX.Element {
        const {
            rhsChannel,
            currentUserId,
            isFlaggedPosts,
            isPinnedPosts,
            postRightVisible,
            postCardVisible,
            previousRhsState,
            searchVisible,
            isPluginView,
            isOpen,
            isExpanded,
        } = this.props;

        let content = null;
        const isSidebarRightExpanded = (postRightVisible || postCardVisible || isPluginView || searchVisible) && isExpanded;

        switch (true) {
        case postRightVisible:
            content = (
                <div className='post-right__container'>
                    <FileUploadOverlay overlayType='right'/>
                    <RhsThread
                        previousRhsState={previousRhsState}
                        currentUserId={currentUserId}
                        toggleSize={this.toggleSize}
                        shrink={this.onShrink}
                    />
                </div>
            );
            break;
        case postCardVisible:
            content = <RhsCard previousRhsState={previousRhsState}/>;
            break;
        case isPluginView:
            content = <RhsPlugin/>;
            break;
        }

        return (
            <div
                className={classNames('sidebar--right', {'sidebar--right--expanded': isSidebarRightExpanded}, {'move--left': isOpen})}
                id='sidebar-right'
                role='complementary'
                ref={this.sidebarRight}
            >
                <div
                    onClick={this.onShrink}
                    className='sidebar--right__bg'
                />
                <div className='sidebar-right-container'>
                    <Search
                        isFocus={searchVisible && !isFlaggedPosts && !isPinnedPosts}
                        isSideBarRight={true}
                        isSideBarRightOpen={this.state.isOpened}
                        getFocus={this.getSearchBarFocus}
                        channelDisplayName={rhsChannel ? rhsChannel.display_name : ''}
                    >
                        {content}
                    </Search>
                </div>
            </div>
        );
    }
}
